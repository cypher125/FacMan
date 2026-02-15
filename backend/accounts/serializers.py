from django.contrib.auth import authenticate
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


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True, min_length=3, max_length=150)
    password = serializers.CharField(
        required=True, min_length=8, write_only=True
    )
    password_confirm = serializers.CharField(required=True, write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists."
            )
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )
        return value

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        email_or_username = data["email"]
        password = data["password"]

        # Try authenticating with the value as username first
        user = authenticate(username=email_or_username, password=password)

        # If that fails, look up by email and try with the actual username
        if user is None:
            try:
                user_obj = User.objects.get(email__iexact=email_or_username)
                user = authenticate(
                    username=user_obj.username, password=password
                )
            except User.DoesNotExist:
                pass

        if user is None:
            raise serializers.ValidationError(
                "Invalid email/username or password."
            )

        if not user.is_active:
            raise serializers.ValidationError("This account is disabled.")

        data["user"] = user
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, min_length=8, write_only=True
    )
    new_password_confirm = serializers.CharField(
        required=True, write_only=True
    )

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def validate(self, data):
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        return data

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user
