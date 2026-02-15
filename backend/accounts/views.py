from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserSerializer


class UserProfileView(APIView):
    """
    Retrieve or update the authenticated user's profile.
    """

    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_id="user_profile_get",
        operation_summary="Get current user profile",
        operation_description=(
            "Returns the profile of the currently authenticated user, "
            "including their Facebook user ID, profile picture, and account details."
        ),
        responses={
            200: openapi.Response(
                description="User profile retrieved successfully.",
                schema=UserSerializer,
                examples={
                    "application/json": {
                        "id": 1,
                        "username": "fb_123456789",
                        "email": "user@example.com",
                        "facebook_user_id": "123456789",
                        "profile_picture_url": "https://graph.facebook.com/123456789/picture",
                        "date_joined": "2025-01-15T10:30:00Z",
                    }
                },
            ),
            401: openapi.Response(description="Authentication credentials were not provided."),
        },
        tags=["User Profile"],
    )
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_id="user_profile_update",
        operation_summary="Update current user profile",
        operation_description=(
            "Partially update the authenticated user's profile. "
            "Only the provided fields will be updated."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "username": openapi.Schema(type=openapi.TYPE_STRING, description="New username"),
                "email": openapi.Schema(type=openapi.TYPE_STRING, format="email", description="New email address"),
            },
        ),
        responses={
            200: openapi.Response(
                description="Profile updated successfully.",
                schema=UserSerializer,
            ),
            400: openapi.Response(description="Validation error."),
            401: openapi.Response(description="Authentication credentials were not provided."),
        },
        tags=["User Profile"],
    )
    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
