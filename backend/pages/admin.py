from django.contrib import admin

from .models import FacebookPage


@admin.register(FacebookPage)
class FacebookPageAdmin(admin.ModelAdmin):
    list_display = ("page_id", "name", "user", "category", "is_active")
    list_filter = ("is_active", "category")
    search_fields = ("page_id", "name")
