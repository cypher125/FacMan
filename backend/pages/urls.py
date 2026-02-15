from django.urls import path

from . import views

urlpatterns = [
    path("", views.PageListView.as_view(), name="page-list"),
    path("sync/", views.PageSyncView.as_view(), name="page-sync"),
    path("<str:page_id>/", views.PageDetailView.as_view(), name="page-detail"),
    path(
        "<str:page_id>/activate/",
        views.PageActivateView.as_view(),
        name="page-activate",
    ),
]
