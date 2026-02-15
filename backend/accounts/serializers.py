from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "facebook_user_id",
            "profile_picture_url",
            "date_joined",
        ]
        read_only_fields = ["id", "facebook_user_id", "date_joined"]
