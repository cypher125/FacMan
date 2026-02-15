from django.conf import settings
from django.db import models


class BulkSchedule(models.Model):
    """A batch of posts scheduled together."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        PARTIAL = "partial", "Partially Completed"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bulk_schedules",
    )
    name = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
    )
    total_posts = models.IntegerField(default=0)
    successful_posts = models.IntegerField(default=0)
    failed_posts = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"BulkSchedule '{self.name}' ({self.status})"


class BulkScheduleItem(models.Model):
    """Individual post within a bulk schedule."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PUBLISHED = "published", "Published"
        SCHEDULED = "scheduled", "Scheduled"
        FAILED = "failed", "Failed"

    bulk_schedule = models.ForeignKey(
        BulkSchedule,
        on_delete=models.CASCADE,
        related_name="items",
    )
    page = models.ForeignKey(
        "pages.FacebookPage",
        on_delete=models.CASCADE,
        related_name="bulk_items",
    )
    post = models.ForeignKey(
        "posts.Post",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bulk_item",
    )
    content = models.TextField(blank=True, default="")
    post_type = models.CharField(max_length=10, default="text")
    media_url = models.URLField(max_length=500, blank=True, default="")
    link_url = models.URLField(max_length=500, blank=True, default="")
    scheduled_time = models.DateTimeField()
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    error_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["scheduled_time"]

    def __str__(self):
        return f"Item for {self.page.name} at {self.scheduled_time}"


class TeamMember(models.Model):
    """Team member association with a Facebook page."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        EDITOR = "editor", "Editor"
        ANALYST = "analyst", "Analyst"
        VIEWER = "viewer", "Viewer"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_memberships",
    )
    page = models.ForeignKey(
        "pages.FacebookPage",
        on_delete=models.CASCADE,
        related_name="team_members",
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.VIEWER,
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invitations_sent",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "page"]
        ordering = ["role", "user__username"]

    def __str__(self):
        return f"{self.user.username} - {self.role} on {self.page.name}"
