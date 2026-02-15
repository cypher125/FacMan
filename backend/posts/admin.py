from django.contrib import admin

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "page", "post_type", "status", "facebook_post_id", "created_at")
    list_filter = ("post_type", "status")
    search_fields = ("content", "facebook_post_id")
