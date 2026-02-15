from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = BaseUserAdmin.list_display + ("facebook_user_id",)
    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Facebook",
            {
                "fields": (
                    "facebook_user_id",
                    "token_expires_at",
                    "facebook_permissions",
                    "profile_picture_url",
                ),
            },
        ),
    )
