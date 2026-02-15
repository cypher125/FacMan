from django.conf import settings
from django.db import models


class Comment(models.Model):
    page = models.ForeignKey(
        "pages.FacebookPage",
        on_delete=models.CASCADE,
        related_name="comments",
    )
    post = models.ForeignKey(
        "posts.Post",
        on_delete=models.CASCADE,
        related_name="comments",
        null=True,
        blank=True,
    )
    facebook_comment_id = models.CharField(max_length=255, unique=True)
    facebook_post_id = models.CharField(max_length=255, blank=True, default="")
    parent_comment_id = models.CharField(max_length=255, blank=True, default="")
    message = models.TextField(blank=True, default="")
    from_name = models.CharField(max_length=255, blank=True, default="")
    from_id = models.CharField(max_length=100, blank=True, default="")
    like_count = models.IntegerField(default=0)
    is_reply = models.BooleanField(default=False)
    comment_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-comment_time"]

    def __str__(self):
        return f"Comment by {self.from_name} on {self.facebook_post_id}"


class Conversation(models.Model):
    page = models.ForeignKey(
        "pages.FacebookPage",
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    facebook_conversation_id = models.CharField(max_length=255, unique=True)
    participant_name = models.CharField(max_length=255, blank=True, default="")
    participant_id = models.CharField(max_length=100, blank=True, default="")
    updated_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-updated_time"]

    def __str__(self):
        return f"Conversation with {self.participant_name}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    facebook_message_id = models.CharField(max_length=255, unique=True)
    message = models.TextField(blank=True, default="")
    from_name = models.CharField(max_length=255, blank=True, default="")
    from_id = models.CharField(max_length=100, blank=True, default="")
    message_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["message_time"]

    def __str__(self):
        return f"Message from {self.from_name}"


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        NEW_COMMENT = "new_comment", "New Comment"
        COMMENT_REPLY = "comment_reply", "Comment Reply"
        NEW_MESSAGE = "new_message", "New Message"
        NEW_LIKE = "new_like", "New Like"
        PAGE_MENTION = "page_mention", "Page Mention"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    page = models.ForeignKey(
        "pages.FacebookPage",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True, default="")
    reference_id = models.CharField(max_length=255, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.notification_type}: {self.title}"
