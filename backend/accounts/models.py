from django.contrib.auth.models import AbstractUser
from django.db import models


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
