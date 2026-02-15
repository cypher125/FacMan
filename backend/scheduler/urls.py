from django.urls import path

from . import views

urlpatterns = [
    # Bulk scheduling
    path(
        "bulk/",
        views.BulkScheduleListView.as_view(),
        name="bulk-schedule-list",
    ),
    path(
        "bulk/create/",
        views.BulkScheduleCreateView.as_view(),
        name="bulk-schedule-create",
    ),
    path(
        "bulk/<int:pk>/",
        views.BulkScheduleDetailView.as_view(),
        name="bulk-schedule-detail",
    ),
    # Content calendar
    path(
        "calendar/",
        views.ContentCalendarView.as_view(),
        name="content-calendar",
    ),
    # Team collaboration
    path(
        "team/<str:page_id>/",
        views.TeamMemberListView.as_view(),
        name="team-list",
    ),
    path(
        "team/<str:page_id>/add/",
        views.TeamMemberAddView.as_view(),
        name="team-add",
    ),
    path(
        "team/<str:page_id>/<int:pk>/update/",
        views.TeamMemberUpdateView.as_view(),
        name="team-update",
    ),
    path(
        "team/<str:page_id>/<int:pk>/remove/",
        views.TeamMemberRemoveView.as_view(),
        name="team-remove",
    ),
    # Advanced analytics
    path(
        "advanced-analytics/",
        views.AdvancedAnalyticsView.as_view(),
        name="advanced-analytics",
    ),
    path(
        "top-posts/",
        views.TopPostsView.as_view(),
        name="top-posts",
    ),
]
