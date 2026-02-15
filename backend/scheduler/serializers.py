from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import BulkSchedule, BulkScheduleItem, TeamMember


class BulkScheduleItemSerializer(serializers.ModelSerializer):
    page_name = serializers.CharField(source="page.name", read_only=True)

    class Meta:
        model = BulkScheduleItem
        fields = [
            "id",
            "page",
            "page_name",
            "post",
            "content",
            "post_type",
            "media_url",
            "link_url",
            "scheduled_time",
            "status",
            "error_message",
            "created_at",
        ]
        read_only_fields = ["id", "post", "status", "error_message", "created_at"]


class BulkScheduleSerializer(serializers.ModelSerializer):
    items = BulkScheduleItemSerializer(many=True, read_only=True)

    class Meta:
        model = BulkSchedule
        fields = [
            "id",
            "name",
            "status",
            "total_posts",
            "successful_posts",
            "failed_posts",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "total_posts",
            "successful_posts",
            "failed_posts",
            "created_at",
            "updated_at",
        ]


class BulkScheduleListSerializer(serializers.ModelSerializer):
    class Meta:
        model = BulkSchedule
        fields = [
            "id",
            "name",
            "status",
            "total_posts",
            "successful_posts",
            "failed_posts",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BulkScheduleCreateItemSerializer(serializers.Serializer):
    page_id = serializers.CharField()
    content = serializers.CharField(required=False, default="", allow_blank=True)
    post_type = serializers.ChoiceField(
        choices=["text", "photo", "video", "link"], default="text"
    )
    media_url = serializers.URLField(required=False, allow_blank=True, default="")
    link_url = serializers.URLField(required=False, allow_blank=True, default="")
    scheduled_time = serializers.DateTimeField()


class BulkScheduleCreateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, default="", allow_blank=True)
    items = BulkScheduleCreateItemSerializer(many=True, min_length=1)

    def validate_items(self, items):
        now = timezone.now()
        min_time = now + timedelta(minutes=10)
        max_time = now + timedelta(days=30)

        for i, item in enumerate(items):
            scheduled = item["scheduled_time"]
            if scheduled < min_time:
                raise serializers.ValidationError(
                    f"Item {i}: scheduled_time must be at least 10 minutes in the future."
                )
            if scheduled > max_time:
                raise serializers.ValidationError(
                    f"Item {i}: scheduled_time must be within 30 days."
                )

            post_type = item.get("post_type", "text")
            if post_type == "text" and not item.get("content"):
                raise serializers.ValidationError(
                    f"Item {i}: content is required for text posts."
                )
            if post_type == "photo" and not item.get("media_url"):
                raise serializers.ValidationError(
                    f"Item {i}: media_url is required for photo posts."
                )
            if post_type == "video" and not item.get("media_url"):
                raise serializers.ValidationError(
                    f"Item {i}: media_url is required for video posts."
                )
            if post_type == "link" and not item.get("link_url"):
                raise serializers.ValidationError(
                    f"Item {i}: link_url is required for link posts."
                )

        return items


class CalendarPostSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    page_id = serializers.CharField()
    page_name = serializers.CharField()
    content = serializers.CharField()
    post_type = serializers.CharField()
    status = serializers.CharField()
    scheduled_time = serializers.DateTimeField(allow_null=True)
    published_at = serializers.DateTimeField(allow_null=True)
    date = serializers.DateField()


class TeamMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)
    invited_by_username = serializers.CharField(
        source="invited_by.username", read_only=True, default=""
    )

    class Meta:
        model = TeamMember
        fields = [
            "id",
            "user",
            "username",
            "email",
            "page",
            "role",
            "invited_by",
            "invited_by_username",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "invited_by", "created_at", "updated_at"]
