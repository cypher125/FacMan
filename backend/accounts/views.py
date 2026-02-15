from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(APIView):
    """
    Register a new user with email, username, and password.
    """

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        operation_id="auth_register",
        operation_summary="Register a new user",
        operation_description=(
            "Create a new user account with email, username, and password. "
            "Returns the user profile and an authentication token.\n\n"
            "**No authentication required.**"
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["email", "username", "password", "password_confirm"],
            properties={
                "email": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format="email",
                    description="User email address (must be unique).",
                ),
                "username": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Username (min 3 chars, must be unique).",
                ),
                "password": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format="password",
                    description="Password (min 8 characters).",
                ),
                "password_confirm": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format="password",
                    description="Must match password.",
                ),
            },
        ),
        responses={
            201: openapi.Response(
                description="User registered successfully.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "token": openapi.Schema(type=openapi.TYPE_STRING),
                        "user": openapi.Schema(type=openapi.TYPE_OBJECT),
                    },
                ),
                examples={
                    "application/json": {
                        "token": "a1b2c3d4e5f6g7h8i9j0",
                        "user": {
                            "id": 1,
                            "username": "johndoe",
                            "email": "john@example.com",
                            "facebook_user_id": None,
                            "profile_picture_url": "",
                            "date_joined": "2026-02-15T10:30:00Z",
                        },
                    }
                },
            ),
            400: openapi.Response(description="Validation error."),
        },
        tags=["Authentication"],
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    Log in with email/username and password.
    """

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        operation_id="auth_login",
        operation_summary="Log in with email/username and password",
        operation_description=(
            "Authenticate with email (or username) and password. "
            "Returns the user profile and an authentication token.\n\n"
            "**No authentication required.**"
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["email", "password"],
            properties={
                "email": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description="Email address or username.",
                ),
                "password": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format="password",
                    description="Account password.",
                ),
            },
        ),
        responses={
            200: openapi.Response(
                description="Login successful.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "token": openapi.Schema(type=openapi.TYPE_STRING),
                        "user": openapi.Schema(type=openapi.TYPE_OBJECT),
                    },
                ),
                examples={
                    "application/json": {
                        "token": "a1b2c3d4e5f6g7h8i9j0",
                        "user": {
                            "id": 1,
                            "username": "johndoe",
                            "email": "john@example.com",
                            "facebook_user_id": None,
                            "profile_picture_url": "",
                            "date_joined": "2026-02-15T10:30:00Z",
                        },
                    }
                },
            ),
            400: openapi.Response(description="Invalid credentials."),
        },
        tags=["Authentication"],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
            }
        )


class LogoutView(APIView):
    """
    Log out the authenticated user by deleting their API token.
    """

    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_id="auth_logout",
        operation_summary="Log out (delete auth token)",
        operation_description=(
            "Deletes the authenticated user's API token, effectively logging them out. "
            "The client should discard the stored token after this call."
        ),
        responses={
            200: openapi.Response(
                description="Logged out successfully.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "detail": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
                examples={
                    "application/json": {"detail": "Logged out successfully."}
                },
            ),
            401: openapi.Response(
                description="Authentication credentials were not provided."
            ),
        },
        tags=["Authentication"],
    )
    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Token.DoesNotExist:
            pass
        return Response({"detail": "Logged out successfully."})


class ChangePasswordView(APIView):
    """
    Change the authenticated user's password.
    """

    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_id="auth_change_password",
        operation_summary="Change password",
        operation_description=(
            "Change the authenticated user's password. Requires the current "
            "password and a new password (min 8 characters)."
        ),
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=[
                "old_password",
                "new_password",
                "new_password_confirm",
            ],
            properties={
                "old_password": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format="password",
                    description="Current password.",
                ),
                "new_password": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format="password",
                    description="New password (min 8 characters).",
                ),
                "new_password_confirm": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format="password",
                    description="Must match new_password.",
                ),
            },
        ),
        responses={
            200: openapi.Response(
                description="Password changed successfully.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "detail": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
                examples={
                    "application/json": {
                        "detail": "Password changed successfully."
                    }
                },
            ),
            400: openapi.Response(description="Validation error."),
            401: openapi.Response(
                description="Authentication credentials were not provided."
            ),
        },
        tags=["Authentication"],
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Password changed successfully."})


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
            401: openapi.Response(
                description="Authentication credentials were not provided."
            ),
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
                "username": openapi.Schema(
                    type=openapi.TYPE_STRING, description="New username"
                ),
                "email": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format="email",
                    description="New email address",
                ),
            },
        ),
        responses={
            200: openapi.Response(
                description="Profile updated successfully.",
                schema=UserSerializer,
            ),
            400: openapi.Response(description="Validation error."),
            401: openapi.Response(
                description="Authentication credentials were not provided."
            ),
        },
        tags=["User Profile"],
    )
    def patch(self, request):
        serializer = UserSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
