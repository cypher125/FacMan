from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Post


class PostSerializer(serializers.ModelSerializer):
    page_name = serializers.CharField(source="page.name", read_only=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "page",
            "page_name",
            "content",
            "media_urls",
            "post_type",
            "facebook_post_id",
            "link_url",
            "scheduled_time",
            "published_at",
            "status",
            "engagement_metrics",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "facebook_post_id",
            "published_at",
            "engagement_metrics",
            "error_message",
            "created_at",
            "updated_at",
        ]


class PostCreateSerializer(serializers.Serializer):
    page_id = serializers.CharField()
    content = serializers.CharField(required=False, default="", allow_blank=True)
    post_type = serializers.ChoiceField(choices=Post.PostType.choices, default="text")
    media_url = serializers.URLField(required=False, allow_blank=True, default="")
    link_url = serializers.URLField(required=False, allow_blank=True, default="")
    video_title = serializers.CharField(required=False, allow_blank=True, default="")
    scheduled_time = serializers.DateTimeField(required=False, allow_null=True, default=None)

    def validate(self, data):
        post_type = data.get("post_type", "text")
        content = data.get("content", "")
        media_url = data.get("media_url", "")

        if post_type == "text" and not content:
            raise serializers.ValidationError("Content is required for text posts.")
        if post_type == "photo" and not media_url:
            raise serializers.ValidationError("media_url is required for photo posts.")
        if post_type == "video" and not media_url:
            raise serializers.ValidationError("media_url is required for video posts.")
        if post_type == "link" and not data.get("link_url"):
            raise serializers.ValidationError("link_url is required for link posts.")

        scheduled = data.get("scheduled_time")
        if scheduled:
            now = timezone.now()
            min_time = now + timedelta(minutes=10)
            max_time = now + timedelta(days=30)
            if scheduled < min_time:
                raise serializers.ValidationError(
                    "Scheduled time must be at least 10 minutes in the future."
                )
            if scheduled > max_time:
                raise serializers.ValidationError(
                    "Scheduled time must be within 30 days."
                )

        return data
