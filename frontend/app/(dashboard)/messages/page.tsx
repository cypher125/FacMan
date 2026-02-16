"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Mail,
  Bell,
  Send,
  CheckCheck,
  Reply,
} from "lucide-react";
import api from "@/lib/api";
import {
  FacebookPage,
  Post,
  Comment,
  Conversation,
  Message,
  Notification,
} from "@/lib/types";

type Tab = "comments" | "conversations" | "notifications";

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("comments");
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Comments state
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/pages/").catch(() => ({ data: [] })),
      api.get("/posts/").catch(() => ({ data: [] })),
    ]).then(([pagesRes, postsRes]) => {
      const pageList = pagesRes.data.results || pagesRes.data;
      const postList = postsRes.data.results || postsRes.data;
      const pArr = Array.isArray(pageList) ? pageList : [];
      setPages(pArr);
      setPosts(Array.isArray(postList) ? postList : []);
      const active = pArr.find((p: FacebookPage) => p.is_active);
      if (active) setActivePage(active);
      setLoading(false);
    });
  }, []);

  // Fetch comments when a post is selected
  useEffect(() => {
    if (!activePage || !selectedPost?.facebook_post_id) return;
    setLoadingComments(true);
    api
      .get(
        `/messages/comments/${activePage.page_id}/${selectedPost.facebook_post_id}/`
      )
      .then((res) => {
        const list = res.data.results || res.data;
        setComments(Array.isArray(list) ? list : []);
      })
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [activePage, selectedPost]);

  // Fetch conversations when tab switches
  useEffect(() => {
    if (activeTab !== "conversations" || !activePage) return;
    api
      .get(`/messages/conversations/${activePage.page_id}/`)
      .then((res) => {
        const list = res.data.results || res.data;
        setConversations(Array.isArray(list) ? list : []);
      })
      .catch(() => setConversations([]));
  }, [activeTab, activePage]);

  // Fetch notifications when tab switches
  useEffect(() => {
    if (activeTab !== "notifications") return;
    setLoadingNotifications(true);
    api
      .get("/messages/notifications/")
      .then((res) => {
        const list = res.data.results || res.data;
        setNotifications(Array.isArray(list) ? list : []);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifications(false));
  }, [activeTab]);

  const handleReply = (commentFbId: string) => {
    if (!activePage || !replyText.trim()) return;
    setSendingReply(true);
    api
      .post(`/messages/comments/${activePage.page_id}/${commentFbId}/reply/`, {
        message: replyText,
      })
      .then(() => {
        setReplyText("");
        setReplyingTo(null);
        // Refetch comments
        if (selectedPost?.facebook_post_id) {
          api
            .get(
              `/messages/comments/${activePage.page_id}/${selectedPost.facebook_post_id}/`
            )
            .then((res) => {
              const list = res.data.results || res.data;
              setComments(Array.isArray(list) ? list : []);
            });
        }
      })
      .catch(() => {})
      .finally(() => setSendingReply(false));
  };

  const handleViewMessages = (convo: Conversation) => {
    setSelectedConvo(convo);
    setLoadingMessages(true);
    api
      .get(
        `/messages/conversations/${activePage?.page_id}/${convo.facebook_conversation_id}/messages/`
      )
      .then((res) => {
        const list = res.data.results || res.data;
        setMessages(Array.isArray(list) ? list : []);
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
  };

  const handleSendMessage = () => {
    if (!activePage || !newMessage.trim() || !selectedConvo) return;
    setSendingMessage(true);
    api
      .post(`/messages/conversations/${activePage.page_id}/send/`, {
        conversation_id: selectedConvo.facebook_conversation_id,
        message: newMessage,
      })
      .then(() => {
        setNewMessage("");
        handleViewMessages(selectedConvo);
      })
      .catch(() => {})
      .finally(() => setSendingMessage(false));
  };

  const handleMarkRead = (id: number) => {
    api
      .post(`/messages/notifications/${id}/read/`)
      .then(() => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
      })
      .catch(() => {});
  };

  const handleMarkAllRead = () => {
    api
      .post("/messages/notifications/read-all/")
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      })
      .catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const tabs: { key: Tab; label: string; icon: typeof MessageSquare }[] = [
    { key: "comments", label: "Comments", icon: MessageSquare },
    { key: "conversations", label: "Conversations", icon: Mail },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted">
          Comments, conversations, and notifications
        </p>
      </div>

      {/* Page selector */}
      {pages.length > 0 && activeTab !== "notifications" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Page:</span>
          <select
            value={activePage?.id || ""}
            onChange={(e) => {
              const p = pages.find((pg) => pg.id === Number(e.target.value));
              if (p) setActivePage(p);
            }}
            className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-card-border bg-card-bg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {tab.key === "notifications" && unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Comments Tab */}
      {activeTab === "comments" && (
        <div className="space-y-4">
          {!activePage ? (
            <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
              <MessageSquare size={40} className="mx-auto text-muted" />
              <p className="mt-3 font-medium">No active page</p>
              <p className="mt-1 text-sm text-muted">
                Select a page to view comments
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Select a post
                </label>
                <select
                  value={selectedPost?.id || ""}
                  onChange={(e) => {
                    const p = posts.find(
                      (post) => post.id === Number(e.target.value)
                    );
                    setSelectedPost(p || null);
                  }}
                  className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose a post...</option>
                  {posts
                    .filter((p) => p.facebook_post_id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.content.slice(0, 80)}
                        {p.content.length > 80 ? "..." : ""}
                      </option>
                    ))}
                </select>
              </div>

              {selectedPost && loadingComments && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl border border-card-border bg-card-bg"
                    />
                  ))}
                </div>
              )}

              {selectedPost && !loadingComments && comments.length === 0 && (
                <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
                  <MessageSquare size={32} className="mx-auto text-muted" />
                  <p className="mt-3 font-medium">No comments</p>
                </div>
              )}

              {selectedPost && !loadingComments && comments.length > 0 && (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-xl border border-card-border bg-card-bg p-4 ${
                        comment.is_reply ? "ml-8" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {comment.from_name}
                          </p>
                          <p className="mt-1 text-sm">{comment.message}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                            <span>
                              {new Date(comment.created_at).toLocaleString()}
                            </span>
                            <span>{comment.like_count} likes</span>
                          </div>
                        </div>
                        {!comment.is_reply && (
                          <button
                            onClick={() =>
                              setReplyingTo(
                                replyingTo === comment.facebook_comment_id
                                  ? null
                                  : comment.facebook_comment_id
                              )
                            }
                            className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <Reply size={14} />
                          </button>
                        )}
                      </div>
                      {replyingTo === comment.facebook_comment_id && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
                          />
                          <button
                            onClick={() =>
                              handleReply(comment.facebook_comment_id)
                            }
                            disabled={sendingReply || !replyText.trim()}
                            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === "conversations" && (
        <div className="space-y-4">
          {!activePage ? (
            <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
              <Mail size={40} className="mx-auto text-muted" />
              <p className="mt-3 font-medium">No active page</p>
              <p className="mt-1 text-sm text-muted">
                Select a page to view conversations
              </p>
            </div>
          ) : selectedConvo ? (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSelectedConvo(null);
                  setMessages([]);
                }}
                className="text-sm text-primary hover:underline"
              >
                &larr; Back to conversations
              </button>
              <div className="rounded-xl border border-card-border bg-card-bg p-4">
                <p className="font-medium">{selectedConvo.participant_name}</p>
                <p className="text-xs text-muted">
                  {selectedConvo.message_count} messages
                </p>
              </div>

              {loadingMessages ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-xl border border-card-border bg-card-bg"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-xl border border-card-border bg-card-bg p-3"
                    >
                      <p className="text-xs font-medium text-muted">
                        {msg.from_name}
                      </p>
                      <p className="mt-1 text-sm">{msg.message}</p>
                      <p className="mt-1 text-xs text-muted">
                        {new Date(msg.created_time).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-sm text-muted text-center py-4">
                      No messages in this conversation
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendMessage()
                  }
                  className="flex-1 rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
              <Mail size={40} className="mx-auto text-muted" />
              <p className="mt-3 font-medium">No conversations</p>
              <p className="mt-1 text-sm text-muted">
                Conversations will appear here when users message your page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => handleViewMessages(convo)}
                  className="w-full rounded-xl border border-card-border bg-card-bg p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{convo.participant_name}</p>
                    <span className="text-xs text-muted">
                      {new Date(convo.updated_time).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {convo.message_count} messages
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            </div>
          )}

          {loadingNotifications ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-xl border border-card-border bg-card-bg"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
              <Bell size={40} className="mx-auto text-muted" />
              <p className="mt-3 font-medium">No notifications</p>
              <p className="mt-1 text-sm text-muted">
                You&apos;re all caught up
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`rounded-xl border border-card-border bg-card-bg p-4 ${
                    !notif.is_read ? "border-l-4 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="mt-1 text-sm text-muted">{notif.body}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                        <span>{notif.notification_type}</span>
                        <span>
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="shrink-0 rounded-lg px-2 py-1 text-xs text-primary hover:bg-primary-light"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
