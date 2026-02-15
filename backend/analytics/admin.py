from django.contrib import admin

from .models import PageInsight


@admin.register(PageInsight)
class PageInsightAdmin(admin.ModelAdmin):
    list_display = ("page", "metric_type", "value", "date", "period")
    list_filter = ("metric_type", "period", "date")
    search_fields = ("metric_type", "page__name")
