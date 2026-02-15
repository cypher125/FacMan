from rest_framework import serializers

from .models import PageInsight


class PageInsightSerializer(serializers.ModelSerializer):
    page_name = serializers.CharField(source="page.name", read_only=True)

    class Meta:
        model = PageInsight
        fields = [
            "id",
            "page",
            "page_name",
            "metric_type",
            "value",
            "date",
            "period",
            "title",
            "description",
            "created_at",
        ]
        read_only_fields = fields


class InsightsSummarySerializer(serializers.Serializer):
    metric_type = serializers.CharField()
    total = serializers.IntegerField()
    average = serializers.FloatField()
    min_value = serializers.IntegerField()
    max_value = serializers.IntegerField()
    data_points = serializers.IntegerField()
