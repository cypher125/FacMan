import logging

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import require_scope
from facebook_auth.utils import decrypt_token, encrypt_token

from .models import FacebookPage
from .serializers import FacebookPageSerializer
from .services import get_user_pages

logger = logging.getLogger(__name__)

_error_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={"error": openapi.Schema(type=openapi.TYPE_STRING)},
)


class PageListView(generics.ListAPIView):
    """
    List all Facebook pages belonging to the authenticated user.
    """

    serializer_class = FacebookPageSerializer
    permission_classes = [IsAuthenticated, require_scope("pages:read")]

    @swagger_auto_schema(
        operation_id="pages_list",
        operation_summary="List user's Facebook pages",
        operation_description=(
            "Returns all Facebook pages that the authenticated user has connected. "
            "Pages must first be synced from Facebook using the sync endpoint."
        ),
        responses={
            200: openapi.Response(
                description="List of Facebook pages.",
                schema=FacebookPageSerializer(many=True),
            ),
            401: openapi.Response(description="Authentication credentials were not provided."),
        },
        tags=["Pages"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return FacebookPage.objects.filter(user=self.request.user)


class PageSyncView(APIView):
    """
    Fetch pages from Facebook Graph API and sync them to the local database.
    """

    permission_classes = [IsAuthenticated, require_scope("pages:write")]

    @swagger_auto_schema(
        operation_id="pages_sync",
        operation_summary="Sync pages from Facebook",
        operation_description=(
            "Calls the Facebook Graph API to fetch all pages the user manages, "
            "then creates or updates them in the local database. "
            "Pages already owned by a different user are skipped.\n\n"
            "**Requires:** The user must have a valid Facebook access token (obtained via OAuth login)."
        ),
        request_body=None,
        responses={
            200: openapi.Response(
                description="Pages synced successfully. Returns the list of synced pages.",
                schema=FacebookPageSerializer(many=True),
            ),
            400: openapi.Response(
                description="No Facebook access token found.",
                schema=_error_schema,
            ),
            502: openapi.Response(
                description="Failed to fetch pages from Facebook API.",
                schema=_error_schema,
            ),
        },
        tags=["Pages"],
    )
    def post(self, request):
        user = request.user
        user_token = decrypt_token(user.facebook_access_token)
        if not user_token:
            return Response(
                {"error": "No Facebook access token found. Please authenticate first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fb_pages = get_user_pages(user_token)
        except Exception:
            logger.exception("Failed to fetch pages from Facebook API")
            return Response(
                {"error": "Failed to fetch pages from Facebook."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        synced = []
        for page_data in fb_pages:
            picture_url = ""
            picture = page_data.get("picture", {})
            if isinstance(picture, dict):
                picture_url = picture.get("data", {}).get("url", "")

            existing = FacebookPage.objects.filter(
                page_id=page_data["id"]
            ).exclude(user=user).first()
            if existing:
                continue

            page, _created = FacebookPage.objects.update_or_create(
                page_id=page_data["id"],
                defaults={
                    "user": user,
                    "name": page_data.get("name", ""),
                    "access_token": encrypt_token(page_data.get("access_token", "")),
                    "category": page_data.get("category", ""),
                    "about": page_data.get("about", ""),
                    "fan_count": page_data.get("fan_count", 0),
                    "link": page_data.get("link", ""),
                    "picture_url": picture_url,
                    "tasks": page_data.get("tasks", []),
                },
            )
            synced.append(page)

        serializer = FacebookPageSerializer(synced, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PageDetailView(generics.RetrieveAPIView):
    """
    Retrieve a specific Facebook page by its Facebook page ID.
    """

    serializer_class = FacebookPageSerializer
    permission_classes = [IsAuthenticated, require_scope("pages:read")]
    lookup_field = "page_id"

    @swagger_auto_schema(
        operation_id="pages_detail",
        operation_summary="Get a Facebook page",
        operation_description=(
            "Returns the details of a specific Facebook page identified by its Facebook page ID. "
            "The page must belong to the authenticated user."
        ),
        responses={
            200: openapi.Response(
                description="Page details.",
                schema=FacebookPageSerializer,
            ),
            404: openapi.Response(description="Page not found."),
        },
        tags=["Pages"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return FacebookPage.objects.filter(user=self.request.user)


class PageActivateView(APIView):
    """
    Set a Facebook page as the active page for the user.
    """

    permission_classes = [IsAuthenticated, require_scope("pages:write")]

    @swagger_auto_schema(
        operation_id="pages_activate",
        operation_summary="Activate a Facebook page",
        operation_description=(
            "Sets the specified page as the user's active page. "
            "All other pages for this user are deactivated first. "
            "Only one page can be active at a time."
        ),
        responses={
            200: openapi.Response(
                description="Page activated successfully.",
                schema=FacebookPageSerializer,
            ),
            404: openapi.Response(
                description="Page not found.",
                schema=_error_schema,
            ),
        },
        tags=["Pages"],
    )
    def post(self, request, page_id):
        try:
            page = FacebookPage.objects.get(page_id=page_id, user=request.user)
        except FacebookPage.DoesNotExist:
            return Response(
                {"error": "Page not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        FacebookPage.objects.filter(user=request.user, is_active=True).update(
            is_active=False
        )
        page.is_active = True
        page.save(update_fields=["is_active", "updated_at"])

        serializer = FacebookPageSerializer(page)
        return Response(serializer.data, status=status.HTTP_200_OK)
