from django.utils.timezone import now
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from .models import APIKey


class APIKeyAuthentication(BaseAuthentication):
    keyword = "Api-Key"

    def authenticate(self, request):
        auth_header = get_authorization_header(request).split()
        if not auth_header or auth_header[0].lower() != b"api-key":
            return None

        if len(auth_header) == 1:
            raise AuthenticationFailed("Invalid API key header. No key provided.")
        if len(auth_header) > 2:
            raise AuthenticationFailed(
                "Invalid API key header. Key should not contain spaces."
            )

        key = auth_header[1].decode()

        try:
            api_key = APIKey.objects.select_related("user").get(
                key=key, is_active=True
            )
        except APIKey.DoesNotExist:
            raise AuthenticationFailed("Invalid or revoked API key.")

        if not api_key.user.is_active:
            raise AuthenticationFailed("User account is disabled.")

        api_key.last_used_at = now()
        api_key.save(update_fields=["last_used_at"])

        request.api_key = api_key
        return (api_key.user, None)

    def authenticate_header(self, request):
        return self.keyword
