from django.urls import path

from . import views

urlpatterns = [
    path(
        "<str:page_id>/sync/",
        views.InsightsSyncView.as_view(),
        name="insights-sync",
    ),
    path(
        "<str:page_id>/",
        views.InsightsListView.as_view(),
        name="insights-list",
    ),
    path(
        "<str:page_id>/summary/",
        views.InsightsSummaryView.as_view(),
        name="insights-summary",
    ),
    path(
        "<str:page_id>/export/",
        views.InsightsExportView.as_view(),
        name="insights-export",
    ),
]
