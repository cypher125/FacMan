from django.contrib import admin

from .models import Comment, Conversation, Message, Notification


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("facebook_comment_id", "from_name", "page", "like_count", "comment_time")
    list_filter = ("is_reply",)
    search_fields = ("message", "from_name", "facebook_comment_id")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("facebook_conversation_id", "participant_name", "page", "updated_time")
    search_fields = ("participant_name",)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("facebook_message_id", "from_name", "conversation", "message_time")
    search_fields = ("message", "from_name")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("notification_type", "title", "user", "page", "is_read", "created_at")
    list_filter = ("notification_type", "is_read")
    search_fields = ("title", "body")
