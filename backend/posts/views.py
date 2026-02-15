import logging

from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from facebook_auth.utils import decrypt_token
from pages.models import FacebookPage

from .models import Post
from .serializers import PostCreateSerializer, PostSerializer
from .services import (
    create_photo_post,
    create_text_post,
    create_video_post,
    delete_post,
    get_page_posts,
    update_post,
)

logger = logging.getLogger(__name__)

_error_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={"error": openapi.Schema(type=openapi.TYPE_STRING)},
)


class PostListView(generics.ListAPIView):
    """
    List posts for the authenticated user with optional filters.
    """

    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="posts_list",
        operation_summary="List posts",
        operation_description=(
            "Returns all posts belonging to the authenticated user. "
            "Results can be filtered by Facebook page ID and/or post status.\n\n"
            "**Pagination:** 20 items per page. Use `?page=N` to navigate."
        ),
        manual_parameters=[
            openapi.Parameter(
                "page_id", openapi.IN_QUERY,
                description="Filter by Facebook page ID.",
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                "status", openapi.IN_QUERY,
                description="Filter by post status.",
                type=openapi.TYPE_STRING,
                enum=["draft", "scheduled", "published", "failed"],
            ),
        ],
        responses={
            200: openapi.Response(description="Paginated list of posts.", schema=PostSerializer(many=True)),
        },
        tags=["Posts"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        qs = Post.objects.filter(user=self.request.user)
        page_id = self.request.query_params.get("page_id")
        if page_id:
            qs = qs.filter(page__page_id=page_id)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs


class PostCreateView(APIView):
    """
    Create and publish a new post to a Facebook page.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="posts_create",
        operation_summary="Create a post",
        operation_description=(
            "Creates a new post and publishes it to Facebook. Supports text, link, photo, and video posts.\n\n"
            "**Scheduling:** Provide `scheduled_time` (ISO 8601) to schedule the post instead of publishing immediately. "
            "Must be between 10 minutes and 30 days in the future.\n\n"
            "**Post types:**\n"
            "- `text` - Text-only post\n"
            "- `link` - Post with a link URL\n"
            "- `photo` - Post with an image (provide `media_url`)\n"
            "- `video` - Post with a video (provide `media_url`, optional `video_title`)"
        ),
        request_body=PostCreateSerializer,
        responses={
            201: openapi.Response(description="Post created and published successfully.", schema=PostSerializer),
            400: openapi.Response(description="Validation error or missing page token.", schema=_error_schema),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to publish to Facebook.", schema=PostSerializer),
        },
        tags=["Posts"],
    )
    def post(self, request):
        serializer = PostCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            page = FacebookPage.objects.get(
                page_id=data["page_id"], user=request.user
            )
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        page_token = decrypt_token(page.access_token)
        if not page_token:
            return Response(
                {"error": "No access token for this page. Sync pages first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        post_type = data["post_type"]
        content = data.get("content", "")
        media_url = data.get("media_url", "")
        link_url = data.get("link_url", "")
        video_title = data.get("video_title", "")
        scheduled_time = data.get("scheduled_time")

        scheduled_ts = None
        if scheduled_time:
            scheduled_ts = int(scheduled_time.timestamp())

        try:
            if post_type == "text" or post_type == "link":
                fb_response = create_text_post(
                    page.page_id,
                    page_token,
                    content,
                    link=link_url or None,
                    scheduled_publish_time=scheduled_ts,
                )
            elif post_type == "photo":
                fb_response = create_photo_post(
                    page.page_id,
                    page_token,
                    media_url,
                    message=content,
                    scheduled_publish_time=scheduled_ts,
                )
            elif post_type == "video":
                fb_response = create_video_post(
                    page.page_id,
                    page_token,
                    media_url,
                    description=content,
                    title=video_title,
                    scheduled_publish_time=scheduled_ts,
                )
            else:
                return Response(
                    {"error": f"Unsupported post type: {post_type}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception:
            logger.exception("Failed to publish post to Facebook")
            post_obj = Post.objects.create(
                user=request.user,
                page=page,
                content=content,
                media_urls=[media_url] if media_url else [],
                post_type=post_type,
                link_url=link_url,
                scheduled_time=scheduled_time,
                status=Post.Status.FAILED,
                error_message="Failed to publish to Facebook.",
            )
            return Response(
                PostSerializer(post_obj).data,
                status=status.HTTP_502_BAD_GATEWAY,
            )

        fb_post_id = fb_response.get("id") or fb_response.get("post_id", "")
        post_status = Post.Status.SCHEDULED if scheduled_time else Post.Status.PUBLISHED
        published_at = None if scheduled_time else timezone.now()

        post_obj = Post.objects.create(
            user=request.user,
            page=page,
            content=content,
            media_urls=[media_url] if media_url else [],
            post_type=post_type,
            facebook_post_id=fb_post_id,
            link_url=link_url,
            scheduled_time=scheduled_time,
            published_at=published_at,
            status=post_status,
        )

        return Response(
            PostSerializer(post_obj).data,
            status=status.HTTP_201_CREATED,
        )


class PostDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific post by its database ID.
    """

    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="posts_detail",
        operation_summary="Get a post",
        operation_description="Returns the full details of a specific post including engagement metrics.",
        responses={
            200: openapi.Response(description="Post details.", schema=PostSerializer),
            404: openapi.Response(description="Post not found."),
        },
        tags=["Posts"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return Post.objects.filter(user=self.request.user)


class PostUpdateView(APIView):
    """
    Update the content of a published post on Facebook.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="posts_update",
        operation_summary="Update a post",
        operation_description=(
            "Updates the content/message of an existing published post on Facebook. "
            "The post must have a Facebook post ID (i.e., it must have been successfully published)."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["content"],
            properties={
                "content": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="The new text content for the post.",
                ),
            },
        ),
        responses={
            200: openapi.Response(description="Post updated successfully.", schema=PostSerializer),
            400: openapi.Response(description="Missing content or no Facebook post ID.", schema=_error_schema),
            404: openapi.Response(description="Post not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to update post on Facebook.", schema=_error_schema),
        },
        tags=["Posts"],
    )
    def patch(self, request, pk):
        try:
            post_obj = Post.objects.get(pk=pk, user=request.user)
        except Post.DoesNotExist:
            return Response(
                {"error": "Post not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not post_obj.facebook_post_id:
            return Response(
                {"error": "Post has no Facebook ID — cannot update."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_content = request.data.get("content")
        if not new_content:
            return Response(
                {"error": "content is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        page_token = decrypt_token(post_obj.page.access_token)
        if not page_token:
            return Response(
                {"error": "No access token for this page."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            update_post(post_obj.facebook_post_id, page_token, new_content)
        except Exception:
            logger.exception("Failed to update post on Facebook")
            return Response(
                {"error": "Failed to update post on Facebook."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        post_obj.content = new_content
        post_obj.save(update_fields=["content", "updated_at"])

        return Response(PostSerializer(post_obj).data, status=status.HTTP_200_OK)


class PostDeleteView(APIView):
    """
    Delete a post from both Facebook and the local database.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="posts_delete",
        operation_summary="Delete a post",
        operation_description=(
            "Deletes the post from Facebook (if it has a Facebook post ID and valid page token) "
            "and removes it from the local database."
        ),
        responses={
            204: openapi.Response(description="Post deleted successfully."),
            404: openapi.Response(description="Post not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to delete post on Facebook.", schema=_error_schema),
        },
        tags=["Posts"],
    )
    def delete(self, request, pk):
        try:
            post_obj = Post.objects.get(pk=pk, user=request.user)
        except Post.DoesNotExist:
            return Response(
                {"error": "Post not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        page_token = decrypt_token(post_obj.page.access_token)

        if post_obj.facebook_post_id and page_token:
            try:
                delete_post(post_obj.facebook_post_id, page_token)
            except Exception:
                logger.exception("Failed to delete post on Facebook")
                return Response(
                    {"error": "Failed to delete post on Facebook."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        post_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PostSyncView(APIView):
    """
    Fetch published posts from a Facebook page and store them locally.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="posts_sync",
        operation_summary="Sync posts from Facebook",
        operation_description=(
            "Fetches all published posts from the specified Facebook page via the Graph API "
            "and creates or updates them in the local database. "
            "Engagement metrics (reactions, comments, shares) are stored with each post."
        ),
        responses={
            200: openapi.Response(description="Posts synced successfully.", schema=PostSerializer(many=True)),
            400: openapi.Response(description="No access token for this page.", schema=_error_schema),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to fetch posts from Facebook.", schema=_error_schema),
        },
        tags=["Posts"],
    )
    def post(self, request, page_id):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        page_token = decrypt_token(page.access_token)
        if not page_token:
            return Response(
                {"error": "No access token for this page."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fb_posts = get_page_posts(page.page_id, page_token)
        except Exception:
            logger.exception("Failed to fetch posts from Facebook")
            return Response(
                {"error": "Failed to fetch posts from Facebook."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        synced = []
        for fb_post in fb_posts:
            fb_id = fb_post.get("id", "")
            reactions = fb_post.get("reactions", {}).get("summary", {})
            comments = fb_post.get("comments", {}).get("summary", {})
            shares = fb_post.get("shares", {})

            metrics = {
                "reactions": reactions.get("total_count", 0),
                "comments": comments.get("total_count", 0),
                "shares": shares.get("count", 0),
            }

            if not fb_id:
                continue

            post_obj, _ = Post.objects.update_or_create(
                facebook_post_id=fb_id,
                page=page,
                defaults={
                    "user": request.user,
                    "content": fb_post.get("message", ""),
                    "post_type": Post.PostType.TEXT,
                    "status": Post.Status.PUBLISHED,
                    "engagement_metrics": metrics,
                },
            )
            synced.append(post_obj)

        return Response(
            PostSerializer(synced, many=True).data,
            status=status.HTTP_200_OK,
        )
