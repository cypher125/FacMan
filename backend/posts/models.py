from django.conf import settings
from django.db import models


class Post(models.Model):
    class PostType(models.TextChoices):
        TEXT = "text", "Text"
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"
        LINK = "link", "Link"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        SCHEDULED = "scheduled", "Scheduled"
        PUBLISHED = "published", "Published"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    page = models.ForeignKey(
        "pages.FacebookPage",
        on_delete=models.CASCADE,
        related_name="posts",
    )
    content = models.TextField(blank=True, default="")
    media_urls = models.JSONField(default=list, blank=True)
    post_type = models.CharField(
        max_length=10,
        choices=PostType.choices,
        default=PostType.TEXT,
    )
    facebook_post_id = models.CharField(max_length=255, blank=True, default="")
    link_url = models.URLField(max_length=500, blank=True, default="")
    scheduled_time = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    engagement_metrics = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.post_type} on {self.page.name} ({self.status})"
