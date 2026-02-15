from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.FacebookLoginView.as_view(), name="facebook-login"),
    path("callback/", views.FacebookCallbackView.as_view(), name="facebook-callback"),
    path("logout/", views.FacebookLogoutView.as_view(), name="facebook-logout"),
]
