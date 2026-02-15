from rest_framework import serializers

from .models import Comment, Conversation, Message, Notification


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = [
            "id",
            "page",
            "post",
            "facebook_comment_id",
            "facebook_post_id",
            "parent_comment_id",
            "message",
            "from_name",
            "from_id",
            "like_count",
            "is_reply",
            "comment_time",
            "created_at",
        ]
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "facebook_message_id",
            "message",
            "from_name",
            "from_id",
            "message_time",
            "created_at",
        ]
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "page",
            "facebook_conversation_id",
            "participant_name",
            "participant_id",
            "updated_time",
            "messages",
            "created_at",
        ]
        read_only_fields = fields


class ConversationListSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "page",
            "facebook_conversation_id",
            "participant_name",
            "participant_id",
            "updated_time",
            "last_message",
            "created_at",
        ]
        read_only_fields = fields

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-message_time").first()
        if msg:
            return MessageSerializer(msg).data
        return None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "page",
            "notification_type",
            "title",
            "body",
            "reference_id",
            "is_read",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "page",
            "notification_type",
            "title",
            "body",
            "reference_id",
            "created_at",
        ]
