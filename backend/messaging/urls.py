from django.urls import path

from . import views

urlpatterns = [
    # Comments
    path(
        "comments/<str:page_id>/<str:post_fb_id>/sync/",
        views.CommentSyncView.as_view(),
        name="comment-sync",
    ),
    path(
        "comments/<str:page_id>/<str:post_fb_id>/",
        views.CommentListView.as_view(),
        name="comment-list",
    ),
    path(
        "comments/<str:page_id>/<str:comment_fb_id>/reply/",
        views.CommentReplyView.as_view(),
        name="comment-reply",
    ),
    path(
        "comments/<str:page_id>/<str:comment_fb_id>/like/",
        views.CommentLikeView.as_view(),
        name="comment-like",
    ),
    # Conversations & Messages
    path(
        "conversations/<str:page_id>/sync/",
        views.ConversationSyncView.as_view(),
        name="conversation-sync",
    ),
    path(
        "conversations/<str:page_id>/",
        views.ConversationListView.as_view(),
        name="conversation-list",
    ),
    path(
        "conversations/<str:page_id>/<int:pk>/",
        views.ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
    path(
        "conversations/<str:page_id>/send/",
        views.SendMessageView.as_view(),
        name="send-message",
    ),
    # Notifications
    path(
        "notifications/",
        views.NotificationListView.as_view(),
        name="notification-list",
    ),
    path(
        "notifications/<int:pk>/read/",
        views.NotificationMarkReadView.as_view(),
        name="notification-mark-read",
    ),
    path(
        "notifications/read-all/",
        views.NotificationMarkAllReadView.as_view(),
        name="notification-mark-all-read",
    ),
]
