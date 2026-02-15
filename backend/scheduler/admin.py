from django.contrib import admin

from .models import BulkSchedule, BulkScheduleItem, TeamMember


class BulkScheduleItemInline(admin.TabularInline):
    model = BulkScheduleItem
    extra = 0
    readonly_fields = ("post", "status", "error_message")


@admin.register(BulkSchedule)
class BulkScheduleAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "status", "total_posts", "successful_posts", "failed_posts", "created_at")
    list_filter = ("status",)
    search_fields = ("name",)
    inlines = [BulkScheduleItemInline]


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ("user", "page", "role", "invited_by", "created_at")
    list_filter = ("role",)
    search_fields = ("user__username", "page__name")
