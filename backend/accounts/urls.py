from django.urls import path

from . import views

urlpatterns = [
    path("me/", views.UserProfileView.as_view(), name="user-profile"),
]
