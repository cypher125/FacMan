from datetime import timedelta

from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.serializers import UserSerializer

from . import services
from .utils import encrypt_token


class FacebookLoginView(APIView):
    """
    Initiate the Facebook OAuth 2.0 login flow.
    """

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        operation_id="facebook_login",
        operation_summary="Get Facebook OAuth login URL",
        operation_description=(
            "Returns a Facebook authorization URL that the client should redirect the user to. "
            "After the user grants permissions, Facebook will redirect back to the callback URL "
            "with an authorization code.\n\n"
            "**No authentication required.**"
        ),
        responses={
            200: openapi.Response(
                description="Authorization URL generated successfully.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "authorization_url": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            format="uri",
                            description="Facebook OAuth authorization URL to redirect the user to.",
                        ),
                    },
                ),
                examples={
                    "application/json": {
                        "authorization_url": "https://www.facebook.com/v18.0/dialog/oauth?client_id=...&redirect_uri=...&scope=..."
                    }
                },
            ),
        },
        tags=["Authentication"],
    )
    def get(self, request):
        url = services.get_authorization_url()
        return Response({"authorization_url": url})


class FacebookCallbackView(APIView):
    """
    Handle the Facebook OAuth 2.0 callback.
    """

    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        operation_id="facebook_callback",
        operation_summary="Facebook OAuth callback",
        operation_description=(
            "Handles the redirect from Facebook after user authorization. "
            "Exchanges the authorization code for access tokens, fetches the user's "
            "Facebook profile, creates or updates the local user account, and returns "
            "an API authentication token.\n\n"
            "**No authentication required.** This endpoint is called by Facebook's redirect."
        ),
        manual_parameters=[
            openapi.Parameter(
                "code",
                openapi.IN_QUERY,
                description="Authorization code returned by Facebook after user grants permissions.",
                type=openapi.TYPE_STRING,
                required=True,
            ),
        ],
        responses={
            200: openapi.Response(
                description="Authentication successful.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "token": openapi.Schema(
                            type=openapi.TYPE_STRING,
                            description="API authentication token. Use in the Authorization header as 'Token <value>'.",
                        ),
                        "user": openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            description="User profile data.",
                            properties={
                                "id": openapi.Schema(type=openapi.TYPE_INTEGER),
                                "username": openapi.Schema(type=openapi.TYPE_STRING),
                                "email": openapi.Schema(type=openapi.TYPE_STRING),
                                "facebook_user_id": openapi.Schema(type=openapi.TYPE_STRING),
                                "profile_picture_url": openapi.Schema(type=openapi.TYPE_STRING),
                                "date_joined": openapi.Schema(type=openapi.TYPE_STRING, format="date-time"),
                            },
                        ),
                        "created": openapi.Schema(
                            type=openapi.TYPE_BOOLEAN,
                            description="True if this is a new user account, False if existing.",
                        ),
                    },
                ),
                examples={
                    "application/json": {
                        "token": "a1b2c3d4e5f6g7h8i9j0",
                        "user": {
                            "id": 1,
                            "username": "fb_123456789",
                            "email": "user@example.com",
                            "facebook_user_id": "123456789",
                            "profile_picture_url": "https://graph.facebook.com/123456789/picture",
                            "date_joined": "2025-01-15T10:30:00Z",
                        },
                        "created": True,
                    }
                },
            ),
            400: openapi.Response(
                description="Authorization failed or invalid code.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "error": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
                examples={
                    "application/json": {"error": "Facebook authentication failed: invalid code"}
                },
            ),
        },
        tags=["Authentication"],
    )
    def get(self, request):
        code = request.query_params.get("code")
        if not code:
            error = request.query_params.get("error_description", "Authorization failed")
            return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

        try:
            short_token, _ = services.exchange_code_for_token(code)
            access_token, expires_in = services.get_long_lived_token(short_token)
            profile = services.get_user_profile(access_token)
        except Exception as e:
            return Response(
                {"error": f"Facebook authentication failed: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        facebook_id = profile["id"]
        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timedelta(seconds=expires_in)

        picture_url = ""
        picture_data = profile.get("picture", {}).get("data", {})
        if picture_data and not picture_data.get("is_silhouette"):
            picture_url = picture_data.get("url", "")

        user, created = User.objects.update_or_create(
            facebook_user_id=facebook_id,
            defaults={
                "username": f"fb_{facebook_id}",
                "email": profile.get("email", ""),
                "facebook_access_token": encrypt_token(access_token),
                "token_expires_at": expires_at,
                "profile_picture_url": picture_url,
            },
        )

        if created and profile.get("name"):
            parts = profile["name"].split(" ", 1)
            user.first_name = parts[0]
            if len(parts) > 1:
                user.last_name = parts[1]
            user.save(update_fields=["first_name", "last_name"])

        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "token": token.key,
                "user": UserSerializer(user).data,
                "created": created,
            }
        )


