import logging
from datetime import datetime

from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from facebook_auth.utils import decrypt_token
from pages.models import FacebookPage
from posts.models import Post

from .models import Comment, Conversation, Message, Notification
from .serializers import (
    CommentSerializer,
    ConversationListSerializer,
    ConversationSerializer,
    NotificationSerializer,
)
from .services import (
    get_page_conversations,
    get_post_comments,
    like_object,
    reply_to_comment,
    send_page_message,
    unlike_object,
)

logger = logging.getLogger(__name__)

_error_schema = openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={"error": openapi.Schema(type=openapi.TYPE_STRING)},
)


def _parse_fb_time(time_str):
    if not time_str:
        return None
    try:
        return datetime.fromisoformat(time_str.replace("+0000", "+00:00"))
    except (ValueError, TypeError):
        return None


def _get_page_and_token(page_id, user):
    try:
        page = FacebookPage.objects.get(page_id=page_id, user=user)
    except FacebookPage.DoesNotExist:
        return None, None, Response(
            {"error": "Page not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    page_token = decrypt_token(page.access_token)
    if not page_token:
        return None, None, Response(
            {"error": "No access token for this page."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return page, page_token, None


# ── Comments ──────────────────────────────────────────────


class CommentSyncView(APIView):
    """
    Fetch comments for a post from Facebook and store locally.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="comments_sync",
        operation_summary="Sync comments from Facebook",
        operation_description=(
            "Fetches all comments for a specific post from the Facebook Graph API "
            "and stores or updates them in the local database. "
            "Each comment includes the author name, message, like count, and timestamp."
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("post_fb_id", openapi.IN_PATH, description="Facebook post ID.", type=openapi.TYPE_STRING, required=True),
        ],
        responses={
            200: openapi.Response(description="Comments synced successfully.", schema=CommentSerializer(many=True)),
            400: openapi.Response(description="No access token for this page.", schema=_error_schema),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to fetch comments from Facebook.", schema=_error_schema),
        },
        tags=["Comments"],
    )
    def post(self, request, page_id, post_fb_id):
        page, page_token, err = _get_page_and_token(page_id, request.user)
        if err:
            return err

        try:
            fb_comments = get_post_comments(post_fb_id, page_token)
        except Exception:
            logger.exception("Failed to fetch comments from Facebook")
            return Response(
                {"error": "Failed to fetch comments from Facebook."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        local_post = Post.objects.filter(
            facebook_post_id=post_fb_id, page=page
        ).first()

        synced = []
        for c in fb_comments:
            from_data = c.get("from", {})
            comment, _ = Comment.objects.update_or_create(
                facebook_comment_id=c["id"],
                defaults={
                    "page": page,
                    "post": local_post,
                    "facebook_post_id": post_fb_id,
                    "message": c.get("message", ""),
                    "from_name": from_data.get("name", ""),
                    "from_id": from_data.get("id", ""),
                    "like_count": c.get("like_count", 0),
                    "comment_time": _parse_fb_time(c.get("created_time")),
                },
            )
            synced.append(comment)

        return Response(
            CommentSerializer(synced, many=True).data,
            status=status.HTTP_200_OK,
        )


class CommentListView(generics.ListAPIView):
    """
    List locally stored comments for a post.
    """

    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="comments_list",
        operation_summary="List comments for a post",
        operation_description=(
            "Returns all locally stored comments for a specific Facebook post. "
            "Comments must first be synced from Facebook using the sync endpoint.\n\n"
            "**Pagination:** 20 items per page."
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("post_fb_id", openapi.IN_PATH, description="Facebook post ID.", type=openapi.TYPE_STRING, required=True),
        ],
        responses={
            200: openapi.Response(description="List of comments.", schema=CommentSerializer(many=True)),
        },
        tags=["Comments"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        page_id = self.kwargs["page_id"]
        post_fb_id = self.kwargs["post_fb_id"]
        return Comment.objects.filter(
            page__page_id=page_id,
            page__user=self.request.user,
            facebook_post_id=post_fb_id,
        )


class CommentReplyView(APIView):
    """
    Reply to a comment on Facebook.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="comments_reply",
        operation_summary="Reply to a comment",
        operation_description=(
            "Posts a reply to a specific comment on Facebook as the page. "
            "The reply is also stored locally as a comment with `is_reply=true`."
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("comment_fb_id", openapi.IN_PATH, description="Facebook comment ID to reply to.", type=openapi.TYPE_STRING, required=True),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["message"],
            properties={
                "message": openapi.Schema(type=openapi.TYPE_STRING, description="Reply text."),
            },
        ),
        responses={
            201: openapi.Response(
                description="Reply posted successfully.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={"id": openapi.Schema(type=openapi.TYPE_STRING, description="Facebook comment ID of the reply.")},
                ),
            ),
            400: openapi.Response(description="Message is required or no access token.", schema=_error_schema),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to reply to comment on Facebook.", schema=_error_schema),
        },
        tags=["Comments"],
    )
    def post(self, request, page_id, comment_fb_id):
        page, page_token, err = _get_page_and_token(page_id, request.user)
        if err:
            return err

        message = request.data.get("message", "").strip()
        if not message:
            return Response(
                {"error": "message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fb_response = reply_to_comment(comment_fb_id, page_token, message)
        except Exception:
            logger.exception("Failed to reply to comment on Facebook")
            return Response(
                {"error": "Failed to reply to comment."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        reply_id = fb_response.get("id", "")
        if reply_id:
            Comment.objects.create(
                page=page,
                facebook_comment_id=reply_id,
                parent_comment_id=comment_fb_id,
                message=message,
                from_name=page.name,
                from_id=page.page_id,
                is_reply=True,
            )

        return Response(fb_response, status=status.HTTP_201_CREATED)


class CommentLikeView(APIView):
    """
    Like or unlike a comment on Facebook.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="comments_like",
        operation_summary="Like a comment",
        operation_description="Likes a comment on Facebook as the page.",
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("comment_fb_id", openapi.IN_PATH, description="Facebook comment ID.", type=openapi.TYPE_STRING, required=True),
        ],
        responses={
            200: openapi.Response(
                description="Comment liked successfully.",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={"success": openapi.Schema(type=openapi.TYPE_BOOLEAN)}),
            ),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to like comment.", schema=_error_schema),
        },
        tags=["Comments"],
    )
    def post(self, request, page_id, comment_fb_id):
        page, page_token, err = _get_page_and_token(page_id, request.user)
        if err:
            return err
        try:
            result = like_object(comment_fb_id, page_token)
        except Exception:
            logger.exception("Failed to like comment")
            return Response(
                {"error": "Failed to like comment."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(result, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_id="comments_unlike",
        operation_summary="Unlike a comment",
        operation_description="Removes a like from a comment on Facebook.",
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("comment_fb_id", openapi.IN_PATH, description="Facebook comment ID.", type=openapi.TYPE_STRING, required=True),
        ],
        responses={
            200: openapi.Response(
                description="Comment unliked successfully.",
                schema=openapi.Schema(type=openapi.TYPE_OBJECT, properties={"success": openapi.Schema(type=openapi.TYPE_BOOLEAN)}),
            ),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to unlike comment.", schema=_error_schema),
        },
        tags=["Comments"],
    )
    def delete(self, request, page_id, comment_fb_id):
        page, page_token, err = _get_page_and_token(page_id, request.user)
        if err:
            return err
        try:
            result = unlike_object(comment_fb_id, page_token)
        except Exception:
            logger.exception("Failed to unlike comment")
            return Response(
                {"error": "Failed to unlike comment."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response(result, status=status.HTTP_200_OK)


# ── Messaging ─────────────────────────────────────────────


class ConversationSyncView(APIView):
    """
    Fetch conversations from Facebook and store locally.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="conversations_sync",
        operation_summary="Sync conversations from Facebook",
        operation_description=(
            "Fetches all conversations (including messages) for a Facebook page "
            "from the Graph API and stores them locally. "
            "Each conversation includes the participant info and message history."
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
        ],
        responses={
            200: openapi.Response(description="Conversations synced successfully.", schema=ConversationListSerializer(many=True)),
            400: openapi.Response(description="No access token for this page.", schema=_error_schema),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to fetch conversations from Facebook.", schema=_error_schema),
        },
        tags=["Messaging"],
    )
    def post(self, request, page_id):
        page, page_token, err = _get_page_and_token(page_id, request.user)
        if err:
            return err

        try:
            fb_conversations = get_page_conversations(page.page_id, page_token)
        except Exception:
            logger.exception("Failed to fetch conversations from Facebook")
            return Response(
                {"error": "Failed to fetch conversations."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        synced = []
        for conv in fb_conversations:
            conv_id = conv.get("id", "")
            participants = conv.get("participants", {}).get("data", [])
            participant_name = ""
            participant_id = ""
            for p in participants:
                if p.get("id") != page.page_id:
                    participant_name = p.get("name", "")
                    participant_id = p.get("id", "")
                    break

            conversation, _ = Conversation.objects.update_or_create(
                facebook_conversation_id=conv_id,
                defaults={
                    "page": page,
                    "participant_name": participant_name,
                    "participant_id": participant_id,
                    "updated_time": _parse_fb_time(conv.get("updated_time")),
                },
            )

            fb_messages = conv.get("messages", {}).get("data", [])
            for msg in fb_messages:
                msg_from = msg.get("from", {})
                Message.objects.update_or_create(
                    facebook_message_id=msg["id"],
                    defaults={
                        "conversation": conversation,
                        "message": msg.get("message", ""),
                        "from_name": msg_from.get("name", ""),
                        "from_id": msg_from.get("id", ""),
                        "message_time": _parse_fb_time(msg.get("created_time")),
                    },
                )

            synced.append(conversation)

        return Response(
            ConversationListSerializer(synced, many=True).data,
            status=status.HTTP_200_OK,
        )


class ConversationListView(generics.ListAPIView):
    """
    List locally stored conversations for a page.
    """

    serializer_class = ConversationListSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="conversations_list",
        operation_summary="List conversations",
        operation_description=(
            "Returns all locally stored conversations for a Facebook page. "
            "Each conversation includes the participant name and last message preview.\n\n"
            "**Pagination:** 20 items per page."
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
        ],
        responses={
            200: openapi.Response(description="List of conversations.", schema=ConversationListSerializer(many=True)),
        },
        tags=["Messaging"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return Conversation.objects.filter(
            page__page_id=self.kwargs["page_id"],
            page__user=self.request.user,
        )


class ConversationDetailView(generics.RetrieveAPIView):
    """
    Get a conversation with all its messages.
    """

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="conversations_detail",
        operation_summary="Get conversation with messages",
        operation_description=(
            "Returns a single conversation including the full list of messages. "
            "Messages are ordered by timestamp."
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
            openapi.Parameter("pk", openapi.IN_PATH, description="Conversation database ID.", type=openapi.TYPE_INTEGER, required=True),
        ],
        responses={
            200: openapi.Response(description="Conversation with messages.", schema=ConversationSerializer),
            404: openapi.Response(description="Conversation not found."),
        },
        tags=["Messaging"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        return Conversation.objects.filter(
            page__page_id=self.kwargs["page_id"],
            page__user=self.request.user,
        )


class SendMessageView(APIView):
    """
    Send a message to a user via a Facebook page.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="messages_send",
        operation_summary="Send a message",
        operation_description=(
            "Sends a text message to a user via the Facebook page's Messenger. "
            "The recipient must have an existing conversation with the page.\n\n"
            "**Note:** Facebook limits page messaging to users who have messaged the page "
            "within the last 24 hours (standard messaging window)."
        ),
        manual_parameters=[
            openapi.Parameter("page_id", openapi.IN_PATH, description="Facebook page ID.", type=openapi.TYPE_STRING, required=True),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["recipient_id", "message"],
            properties={
                "recipient_id": openapi.Schema(type=openapi.TYPE_STRING, description="Facebook user ID of the recipient."),
                "message": openapi.Schema(type=openapi.TYPE_STRING, description="Message text to send."),
            },
        ),
        responses={
            201: openapi.Response(
                description="Message sent successfully.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "recipient_id": openapi.Schema(type=openapi.TYPE_STRING),
                        "message_id": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            ),
            400: openapi.Response(description="Missing required fields or no access token.", schema=_error_schema),
            404: openapi.Response(description="Page not found.", schema=_error_schema),
            502: openapi.Response(description="Failed to send message via Facebook.", schema=_error_schema),
        },
        tags=["Messaging"],
    )
    def post(self, request, page_id):
        page, page_token, err = _get_page_and_token(page_id, request.user)
        if err:
            return err

        recipient_id = request.data.get("recipient_id", "").strip()
        text = request.data.get("message", "").strip()

        if not recipient_id:
            return Response(
                {"error": "recipient_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not text:
            return Response(
                {"error": "message is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fb_response = send_page_message(
                page.page_id, page_token, recipient_id, text
            )
        except Exception:
            logger.exception("Failed to send message via Facebook")
            return Response(
                {"error": "Failed to send message."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(fb_response, status=status.HTTP_201_CREATED)


# ── Notifications ─────────────────────────────────────────


class NotificationListView(generics.ListAPIView):
    """
    List notifications for the authenticated user.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="notifications_list",
        operation_summary="List notifications",
        operation_description=(
            "Returns notifications for the authenticated user. "
            "Notifications are generated when comments, messages, or other events occur.\n\n"
            "**Filters:**\n"
            "- `unread=true` - Only return unread notifications\n"
            "- `page_id=...` - Filter by Facebook page ID\n\n"
            "**Pagination:** 20 items per page."
        ),
        manual_parameters=[
            openapi.Parameter(
                "unread", openapi.IN_QUERY,
                description="Filter to unread notifications only (true/1).",
                type=openapi.TYPE_BOOLEAN,
            ),
            openapi.Parameter(
                "page_id", openapi.IN_QUERY,
                description="Filter by Facebook page ID.",
                type=openapi.TYPE_STRING,
            ),
        ],
        responses={
            200: openapi.Response(description="List of notifications.", schema=NotificationSerializer(many=True)),
        },
        tags=["Notifications"],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        unread_only = self.request.query_params.get("unread")
        if unread_only and unread_only.lower() in ("true", "1"):
            qs = qs.filter(is_read=False)
        page_id = self.request.query_params.get("page_id")
        if page_id:
            qs = qs.filter(page__page_id=page_id)
        return qs


class NotificationMarkReadView(APIView):
    """
    Mark a notification as read.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="notifications_mark_read",
        operation_summary="Mark notification as read",
        operation_description="Marks a single notification as read by its database ID.",
        manual_parameters=[
            openapi.Parameter("pk", openapi.IN_PATH, description="Notification database ID.", type=openapi.TYPE_INTEGER, required=True),
        ],
        responses={
            200: openapi.Response(description="Notification marked as read.", schema=NotificationSerializer),
            404: openapi.Response(description="Notification not found.", schema=_error_schema),
        },
        tags=["Notifications"],
    )
    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response(
                {"error": "Notification not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_200_OK,
        )


class NotificationMarkAllReadView(APIView):
    """
    Mark all notifications as read for the authenticated user.
    """

    permission_classes = [IsAuthenticated]

    @swagger_auto_schema(
        operation_id="notifications_mark_all_read",
        operation_summary="Mark all notifications as read",
        operation_description="Marks all unread notifications as read for the authenticated user.",
        responses={
            200: openapi.Response(
                description="All notifications marked as read.",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "marked_read": openapi.Schema(
                            type=openapi.TYPE_INTEGER,
                            description="Number of notifications marked as read.",
                        ),
                    },
                ),
                examples={"application/json": {"marked_read": 5}},
            ),
        },
        tags=["Notifications"],
    )
    def post(self, request):
        updated = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response(
            {"marked_read": updated},
            status=status.HTTP_200_OK,
        )
