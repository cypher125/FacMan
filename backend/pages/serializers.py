from rest_framework import serializers

from .models import FacebookPage


class FacebookPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacebookPage
        fields = [
            "id",
            "page_id",
            "name",
            "category",
            "about",
            "fan_count",
            "link",
            "picture_url",
            "tasks",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "page_id",
            "name",
            "category",
            "about",
            "fan_count",
            "link",
            "picture_url",
            "tasks",
            "created_at",
            "updated_at",
        ]
