from django.conf import settings
from django.db import models


class FacebookPage(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pages",
    )
    page_id = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    access_token = models.TextField(blank=True, default="")
    category = models.CharField(max_length=255, blank=True, default="")
    about = models.TextField(blank=True, default="")
    fan_count = models.IntegerField(default=0)
    link = models.URLField(max_length=500, blank=True, default="")
    picture_url = models.URLField(max_length=500, blank=True, default="")
    tasks = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_active", "name"]

    def __str__(self):
        return f"{self.name} ({self.page_id})"
