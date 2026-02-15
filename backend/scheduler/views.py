import logging
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from facebook_auth.utils import decrypt_token
from pages.models import FacebookPage
from posts.models import Post
from posts.services import create_photo_post, create_text_post, create_video_post

from .models import BulkSchedule, BulkScheduleItem, TeamMember
from .serializers import (
    BulkScheduleCreateSerializer,
    BulkScheduleListSerializer,
    BulkScheduleSerializer,
    CalendarPostSerializer,
    TeamMemberSerializer,
)

logger = logging.getLogger(__name__)

_error_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={"error": openapi.Schema(type=openapi.TYPE_STRING)},
)

_date_params = [
    openapi.Parameter(
        "since", openapi.IN_QUERY,
        description="Start date filter (YYYY-MM-DD).",
        type=openapi.TYPE_STRING, format="date",
    ),
    openapi.Parameter(
        "until", openapi.IN_QUERY,
        description="End date filter (YYYY-MM-DD).",
        type=openapi.TYPE_STRING, format="date",
    ),
]


# ── Bulk Scheduling ───────────────────────────────────────


class BulkScheduleListView(generics.ListAPIView):
    """
    List all bulk schedules for the authenticated user.
    """

    serializer_class = BulkScheduleListSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="bulk_schedule_list",
        operation_summary="List bulk schedules",
        operation_description=(
            "Returns all bulk schedules created by the authenticated user. "
            "Each entry shows the schedule name, status, and post counts.\n\n"
            "**Pagination:** 20 items per page."
        ),
        responses={
            200: openapi.Response(description="List of bulk schedules.", schema=BulkScheduleListSerializer(many=True)),
        },
        tags=["Scheduler"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return BulkSchedule.objects.filter(user=self.request.user)


class BulkScheduleDetailView(generics.RetrieveAPIView):
    """
    Get a bulk schedule with all its items.
    """

    serializer_class = BulkScheduleSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="bulk_schedule_detail",
        operation_summary="Get bulk schedule details",
        operation_description=(
            "Returns a bulk schedule with all its individual items, "
            "including their status, content, and any error messages."
        ),
        responses={
            200: openapi.Response(description="Bulk schedule with items.", schema=BulkScheduleSerializer),
            404: openapi.Response(description="Bulk schedule not found."),
        },
        tags=["Scheduler"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return BulkSchedule.objects.filter(user=self.request.user)


class BulkScheduleCreateView(APIView):
    """
    Create a bulk schedule and publish/schedule all items to Facebook.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="bulk_schedule_create",
        operation_summary="Create a bulk schedule",
        operation_description=(
            "Creates multiple scheduled posts in a single request. Each item specifies "
            "a target page, content, post type, and scheduled time.\n\n"
            "All items are published/scheduled to Facebook immediately. The response "
            "includes the overall status and per-item results.\n\n"
            "**Scheduling constraints:**\n"
            "- Each item's `scheduled_time` must be between 10 minutes and 30 days in the future\n"
            "- Maximum 300 unpublished posts per page (Facebook limit)\n"
            "- Maximum 50 batch requests per API call (Facebook limit)"
        ),
        request_body=BulkScheduleCreateSerializer,
        responses={
            201: openapi.Response(
                description="Bulk schedule created. Check individual item statuses for results.",
                schema=BulkScheduleSerializer,
            ),
            400: openapi.Response(description="Validation error.", schema=_error_schema),
            404: openapi.Response(description="One or more pages not found.", schema=_error_schema),
        },
        tags=["Scheduler"],
    )
    def post(self, request):
        serializer = BulkScheduleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        page_ids = {item["page_id"] for item in data["items"]}
        pages = FacebookPage.objects.filter(
            page_id__in=page_ids, user=request.user
        )
        page_map = {p.page_id: p for p in pages}

        missing = page_ids - set(page_map.keys())
        if missing:
            return Response(
                {"error": f"Pages not found: {', '.join(missing)}"},
                status=status.HTTP_404_NOT_FOUND,
            )

        bulk = BulkSchedule.objects.create(
            user=request.user,
            name=data.get("name", ""),
            total_posts=len(data["items"]),
            status=BulkSchedule.Status.PROCESSING,
        )

        successful = 0
        failed = 0

        for item_data in data["items"]:
            page = page_map[item_data["page_id"]]
            page_token = decrypt_token(page.access_token)

            item = BulkScheduleItem.objects.create(
                bulk_schedule=bulk,
                page=page,
                content=item_data.get("content", ""),
                post_type=item_data.get("post_type", "text"),
                media_url=item_data.get("media_url", ""),
                link_url=item_data.get("link_url", ""),
                scheduled_time=item_data["scheduled_time"],
            )

            if not page_token:
                item.status = BulkScheduleItem.Status.FAILED
                item.error_message = "No access token for this page."
                item.save(update_fields=["status", "error_message"])
                failed += 1
                continue

            scheduled_ts = int(item_data["scheduled_time"].timestamp())
            post_type = item_data.get("post_type", "text")
            content = item_data.get("content", "")
            media_url = item_data.get("media_url", "")
            link_url = item_data.get("link_url", "")

            try:
                if post_type in ("text", "link"):
                    fb_resp = create_text_post(
                        page.page_id, page_token, content,
                        link=link_url or None,
                        scheduled_publish_time=scheduled_ts,
                    )
                elif post_type == "photo":
                    fb_resp = create_photo_post(
                        page.page_id, page_token, media_url,
                        message=content,
                        scheduled_publish_time=scheduled_ts,
                    )
                elif post_type == "video":
                    fb_resp = create_video_post(
                        page.page_id, page_token, media_url,
                        description=content,
                        scheduled_publish_time=scheduled_ts,
                    )
                else:
                    raise ValueError(f"Unsupported post type: {post_type}")
            except Exception as e:
                logger.exception("Bulk schedule item failed")
                item.status = BulkScheduleItem.Status.FAILED
                item.error_message = str(e)
                item.save(update_fields=["status", "error_message"])
                failed += 1
                continue

            fb_post_id = fb_resp.get("id") or fb_resp.get("post_id", "")

            post_obj = Post.objects.create(
                user=request.user,
                page=page,
                content=content,
                media_urls=[media_url] if media_url else [],
                post_type=post_type,
                facebook_post_id=fb_post_id,
                link_url=link_url,
                scheduled_time=item_data["scheduled_time"],
                status=Post.Status.SCHEDULED,
            )

            item.post = post_obj
            item.status = BulkScheduleItem.Status.SCHEDULED
            item.save(update_fields=["post", "status"])
            successful += 1

        bulk.successful_posts = successful
        bulk.failed_posts = failed
        if failed == 0:
            bulk.status = BulkSchedule.Status.COMPLETED
        elif successful == 0:
            bulk.status = BulkSchedule.Status.FAILED
        else:
            bulk.status = BulkSchedule.Status.PARTIAL
        bulk.save(update_fields=[
            "successful_posts", "failed_posts", "status", "updated_at"
        ])

        return Response(
            BulkScheduleSerializer(bulk).data,
            status=status.HTTP_201_CREATED,
        )


# ── Content Calendar ──────────────────────────────────────


class ContentCalendarView(APIView):
    """
    Get posts organized by date for a calendar view.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="content_calendar",
        operation_summary="Get content calendar",
        operation_description=(
            "Returns posts organized by date for calendar display. "
            "If no date range is provided, defaults to the current month.\n\n"
            "Includes scheduled, published, and draft posts within the date range."
        ),
        manual_parameters=[
            openapi.Parameter(
                "start", openapi.IN_QUERY,
                description="Start date (YYYY-MM-DD). Defaults to first day of current month.",
                type=openapi.TYPE_STRING, format="date",
            ),
            openapi.Parameter(
                "end", openapi.IN_QUERY,
                description="End date (YYYY-MM-DD). Defaults to last day of current month.",
                type=openapi.TYPE_STRING, format="date",
            ),
            openapi.Parameter(
                "page_id", openapi.IN_QUERY,
                description="Filter by Facebook page ID.",
                type=openapi.TYPE_STRING,
            ),
        ],
        responses={
            200: openapi.Response(
                description="Calendar posts for the date range.",
                schema=CalendarPostSerializer(many=True),
            ),
            400: openapi.Response(description="Invalid date format.", schema=_error_schema),
        },
        tags=["Scheduler"],
    )
    def get(self, request):
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        if not start or not end:
            now = timezone.now()
            start_date = now.replace(day=1).date()
            end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        else:
            start_date = parse_date(start)
            end_date = parse_date(end)
            if not start_date or not end_date:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        qs = Post.objects.filter(user=request.user)

        page_id = request.query_params.get("page_id")
        if page_id:
            qs = qs.filter(page__page_id=page_id)

        qs = qs.filter(
            Q(scheduled_time__date__gte=start_date, scheduled_time__date__lte=end_date)
            | Q(published_at__date__gte=start_date, published_at__date__lte=end_date)
            | Q(
                scheduled_time__isnull=True,
                published_at__isnull=True,
                created_at__date__gte=start_date,
                created_at__date__lte=end_date,
            )
        )

        results = []
        for post in qs.select_related("page"):
            date = None
            if post.scheduled_time:
                date = post.scheduled_time.date()
            elif post.published_at:
                date = post.published_at.date()
            else:
                date = post.created_at.date()

            results.append({
                "id": post.id,
                "page_id": post.page.page_id,
                "page_name": post.page.name,
                "content": post.content,
                "post_type": post.post_type,
                "status": post.status,
                "scheduled_time": post.scheduled_time,
                "published_at": post.published_at,
                "date": date,
            })

        serializer = CalendarPostSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ── Team Collaboration ────────────────────────────────────


class TeamMemberListView(generics.ListAPIView):
    """
    List team members for a page.
    """

    serializer_class = TeamMemberSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="team_members_list",
        operation_summary="List team members",
        operation_description=(
            "Returns all team members assigned to a specific Facebook page. "
            "Only the page owner can view team members."
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
        ],
        responses={
            200: openapi.Response(description="List of team members.", schema=TeamMemberSerializer(many=True)),
        },
        tags=["Team"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return TeamMember.objects.filter(
            page__page_id=self.kwargs["page_id"],
            page__user=self.request.user,
        )


class TeamMemberAddView(APIView):
    """
    Add a team member to a page.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="team_members_add",
        operation_summary="Add a team member",
        operation_description=(
            "Adds a user as a team member to a Facebook page with a specified role. "
            "If the user is already a team member, their role is updated.\n\n"
            "**Available roles:** `admin`, `editor`, `moderator`, `viewer`"
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["user_id"],
            properties={
                "user_id": openapi.Schema(type=openapi.TYPE_INTEGER, description="Database ID of the user to add."),
                "role": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Role to assign.",
                    enum=["admin", "editor", "moderator", "viewer"],
                    default="viewer",
                ),
            },
        ),
        responses={
            201: openapi.Response(description="Team member added.", schema=TeamMemberSerializer),
            200: openapi.Response(description="Team member role updated.", schema=TeamMemberSerializer),
            400: openapi.Response(description="Missing user_id or invalid role.", schema=_error_schema),
            404: openapi.Response(description="Page or user not found.", schema=_error_schema),
        },
        tags=["Team"],
    )
    def post(self, request, page_id):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        user_id = request.data.get("user_id")
        role = request.data.get("role", "viewer")

        if not user_id:
            return Response(
                {"error": "user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role not in dict(TeamMember.Role.choices):
            return Response(
                {"error": f"Invalid role. Choose from: {', '.join(dict(TeamMember.Role.choices).keys())}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            member_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        team_member, created = TeamMember.objects.update_or_create(
            user=member_user,
            page=page,
            defaults={
                "role": role,
                "invited_by": request.user,
            },
        )

        return Response(
            TeamMemberSerializer(team_member).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class TeamMemberUpdateView(APIView):
    """
    Update a team member's role.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="team_members_update",
        operation_summary="Update team member role",
        operation_description="Updates the role of an existing team member on a page.",
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("pk", openapi.IN_PATH, description="Team member database ID.", type=openapi.TYPE_INTEGER, required=True),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["role"],
            properties={
                "role": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="New role to assign.",
                    enum=["admin", "editor", "moderator", "viewer"],
                ),
            },
        ),
        responses={
            200: openapi.Response(description="Team member updated.", schema=TeamMemberSerializer),
            400: openapi.Response(description="Invalid role.", schema=_error_schema),
            404: openapi.Response(description="Page or team member not found.", schema=_error_schema),
        },
        tags=["Team"],
    )
    def patch(self, request, page_id, pk):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            member = TeamMember.objects.get(pk=pk, page=page)
        except TeamMember.DoesNotExist:
            return Response(
                {"error": "Team member not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        role = request.data.get("role")
        if role:
            if role not in dict(TeamMember.Role.choices):
                return Response(
                    {"error": f"Invalid role. Choose from: {', '.join(dict(TeamMember.Role.choices).keys())}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            member.role = role
            member.save(update_fields=["role", "updated_at"])

        return Response(
            TeamMemberSerializer(member).data,
            status=status.HTTP_200_OK,
        )


class TeamMemberRemoveView(APIView):
    """
    Remove a team member from a page.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="team_members_remove",
        operation_summary="Remove a team member",
        operation_description="Removes a team member from a Facebook page. This action is irreversible.",
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("pk", openapi.IN_PATH, description="Team member database ID.", type=openapi.TYPE_INTEGER, required=True),
        ],
        responses={
            204: openapi.Response(description="Team member removed successfully."),
            404: openapi.Response(description="Page or team member not found.", schema=_error_schema),
        },
        tags=["Team"],
    )
    def delete(self, request, page_id, pk):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            member = TeamMember.objects.get(pk=pk, page=page)
        except TeamMember.DoesNotExist:
            return Response(
                {"error": "Team member not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Advanced Analytics ────────────────────────────────────


class AdvancedAnalyticsView(APIView):
    """
    Cross-page analytics comparison and post performance.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="advanced_analytics",
        operation_summary="Get cross-page analytics",
        operation_description=(
            "Returns aggregated analytics across all of the user's Facebook pages. "
            "For each page, includes post counts (total, published, scheduled, failed) "
            "and engagement totals (reactions, comments, shares).\n\n"
            "Use `since` and `until` query parameters to limit the date range."
        ),
        manual_parameters=_date_params,
        responses={
            200: openapi.Response(
                description="Cross-page analytics.",
                schema=openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            "page_id": openapi.Schema(type=openapi.TYPE_STRING),
                            "page_name": openapi.Schema(type=openapi.TYPE_STRING),
                            "fan_count": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "total_posts": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "published": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "scheduled": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "failed": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "total_reactions": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "total_comments": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "total_shares": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "total_engagement": openapi.Schema(type=openapi.TYPE_INTEGER),
                        },
                    ),
                ),
                examples={
                    "application/json": [
                        {
                            "page_id": "123456789",
                            "page_name": "My Business Page",
                            "fan_count": 5200,
                            "total_posts": 45,
                            "published": 40,
                            "scheduled": 3,
                            "failed": 2,
                            "total_reactions": 1250,
                            "total_comments": 380,
                            "total_shares": 95,
                            "total_engagement": 1725,
                        }
                    ]
                },
            ),
        },
        tags=["Advanced Analytics"],
    )
    def get(self, request):
        pages = FacebookPage.objects.filter(user=request.user)
        since = request.query_params.get("since")
        until = request.query_params.get("until")

        page_stats = []
        for page in pages:
            posts_qs = Post.objects.filter(page=page, user=request.user)
            if since:
                parsed = parse_date(since)
                if parsed:
                    posts_qs = posts_qs.filter(created_at__date__gte=parsed)
            if until:
                parsed = parse_date(until)
                if parsed:
                    posts_qs = posts_qs.filter(created_at__date__lte=parsed)

            total_posts = posts_qs.count()
            published = posts_qs.filter(status=Post.Status.PUBLISHED).count()
            scheduled = posts_qs.filter(status=Post.Status.SCHEDULED).count()
            failed = posts_qs.filter(status=Post.Status.FAILED).count()

            total_reactions = 0
            total_comments = 0
            total_shares = 0
            for p in posts_qs.filter(status=Post.Status.PUBLISHED):
                metrics = p.engagement_metrics or {}
                total_reactions += metrics.get("reactions", 0)
                total_comments += metrics.get("comments", 0)
                total_shares += metrics.get("shares", 0)

            page_stats.append({
                "page_id": page.page_id,
                "page_name": page.name,
                "fan_count": page.fan_count,
                "total_posts": total_posts,
                "published": published,
                "scheduled": scheduled,
                "failed": failed,
                "total_reactions": total_reactions,
                "total_comments": total_comments,
                "total_shares": total_shares,
                "total_engagement": total_reactions + total_comments + total_shares,
            })

        return Response(page_stats, status=status.HTTP_200_OK)


class TopPostsView(APIView):
    """
    Get top performing posts ranked by engagement.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="top_posts",
        operation_summary="Get top performing posts",
        operation_description=(
            "Returns published posts ranked by total engagement "
            "(reactions + comments + shares) in descending order.\n\n"
            "Optionally filter by page and limit the number of results (1-50, default 10)."
        ),
        manual_parameters=[
            openapi.Parameter(
                "page_id", openapi.IN_QUERY,
                description="Filter by Facebook page ID.",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                "limit", openapi.IN_QUERY,
                description="Maximum number of posts to return (1-50, default 10).",
                type=openapi.TYPE_INTEGER,
            ),
        ],
        responses={
            200: openapi.Response(
                description="Top performing posts ranked by engagement.",
                schema=openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(
                        type=openapi.TYPE_OBJECT,
                        properties={
                            "id": openapi.Schema(type=openapi.TYPE_INTEGER),
                            "page_id": openapi.Schema(type=openapi.TYPE_STRING),
                            "page_name": openapi.Schema(type=openapi.TYPE_STRING),
                            "content": openapi.Schema(type=openapi.TYPE_STRING, description="First 200 characters of post content."),
                            "post_type": openapi.Schema(type=openapi.TYPE_STRING),
                            "facebook_post_id": openapi.Schema(type=openapi.TYPE_STRING),
                            "published_at": openapi.Schema(type=openapi.TYPE_STRING, format="date-time"),
                            "engagement_metrics": openapi.Schema(
                                type=openapi.TYPE_OBJECT,
                                properties={
                                    "reactions": openapi.Schema(type=openapi.TYPE_INTEGER),
                                    "comments": openapi.Schema(type=openapi.TYPE_INTEGER),
                                    "shares": openapi.Schema(type=openapi.TYPE_INTEGER),
                                },
                            ),
                            "total_engagement": openapi.Schema(type=openapi.TYPE_INTEGER),
                        },
                    ),
                ),
            ),
        },
        tags=["Advanced Analytics"],
    )
    def get(self, request):
        page_id = request.query_params.get("page_id")
        try:
            limit = int(request.query_params.get("limit", "10"))
        except (ValueError, TypeError):
            limit = 10
        limit = min(max(limit, 1), 50)

        qs = Post.objects.filter(
            user=request.user,
            status=Post.Status.PUBLISHED,
        ).select_related("page")

        if page_id:
            qs = qs.filter(page__page_id=page_id)

        posts_with_engagement = []
        for post in qs:
            metrics = post.engagement_metrics or {}
            total = (
                metrics.get("reactions", 0)
                + metrics.get("comments", 0)
                + metrics.get("shares", 0)
            )
            posts_with_engagement.append((total, post))

        posts_with_engagement.sort(key=lambda x: x[0], reverse=True)
        top_posts = posts_with_engagement[:limit]

        results = []
        for engagement, post in top_posts:
            results.append({
                "id": post.id,
                "page_id": post.page.page_id,
                "page_name": post.page.name,
                "content": post.content[:200],
                "post_type": post.post_type,
                "facebook_post_id": post.facebook_post_id,
                "published_at": post.published_at,
                "engagement_metrics": post.engagement_metrics,
                "total_engagement": engagement,
            })

        return Response(results, status=status.HTTP_200_OK)
