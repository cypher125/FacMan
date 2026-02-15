import secrets

from django.contrib.auth.models import AbstractUser
from django.db import models


VALID_SCOPES = [
    "pages:read",
    "pages:write",
    "posts:read",
    "posts:write",
    "analytics:read",
    "analytics:write",
    "messaging:read",
    "messaging:write",
    "scheduler:read",
    "scheduler:write",
]


class User(AbstractUser):
    facebook_user_id = models.CharField(
        max_length=100, blank=True, unique=True, null=True
    )
    facebook_access_token = models.TextField(blank=True, default="")
    token_expires_at = models.DateTimeField(null=True, blank=True)
    facebook_permissions = models.JSONField(default=list, blank=True)
    profile_picture_url = models.URLField(max_length=500, blank=True, default="")

    class Meta:
        db_table = "accounts_user"


class APIKey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True, db_index=True)
    prefix = models.CharField(max_length=8)
    scopes = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "accounts_api_key"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.prefix}...)"

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = secrets.token_hex(32)
            self.prefix = self.key[:8]
        super().save(*args, **kwargs)
