"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Mail,
  Bell,
  Send,
  CheckCheck,
  Reply,
  ThumbsUp,
  RefreshCw,
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

  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [syncingComments, setSyncingComments] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [syncingConversations, setSyncingConversations] = useState(false);

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

  const fetchComments = () => {
    if (!activePage || !selectedPost?.facebook_post_id) return;
    setLoadingComments(true);
    api
      .get(`/messages/comments/${activePage.page_id}/${selectedPost.facebook_post_id}/`)
      .then((res) => {
        const list = res.data.results || res.data;
        setComments(Array.isArray(list) ? list : []);
      })
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, selectedPost]);

  useEffect(() => {
    if (activeTab !== "conversations" || !activePage) return;
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activePage]);

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

  const fetchConversations = () => {
    if (!activePage) return;
    api
      .get(`/messages/conversations/${activePage.page_id}/`)
      .then((res) => {
        const list = res.data.results || res.data;
        setConversations(Array.isArray(list) ? list : []);
      })
      .catch(() => setConversations([]));
  };

  const handleSyncComments = () => {
    if (!activePage || !selectedPost?.facebook_post_id) return;
    setSyncingComments(true);
    api
      .post(`/messages/comments/${activePage.page_id}/${selectedPost.facebook_post_id}/sync/`)
      .then(() => fetchComments())
      .catch(() => {})
      .finally(() => setSyncingComments(false));
  };

  const handleSyncConversations = () => {
    if (!activePage) return;
    setSyncingConversations(true);
    api
      .post(`/messages/conversations/${activePage.page_id}/sync/`)
      .then(() => fetchConversations())
      .catch(() => {})
      .finally(() => setSyncingConversations(false));
  };

  const handleLikeComment = (commentFbId: string) => {
    if (!activePage) return;
    setLikingCommentId(commentFbId);
    api
      .post(`/messages/comments/${activePage.page_id}/${commentFbId}/like/`)
      .then(() => {
        setComments((prev) =>
          prev.map((c) =>
            c.facebook_comment_id === commentFbId
              ? { ...c, like_count: c.like_count + 1 }
              : c
          )
        );
      })
      .catch(() => {})
      .finally(() => setLikingCommentId(null));
  };

  const handleUnlikeComment = (commentFbId: string) => {
    if (!activePage) return;
    setLikingCommentId(commentFbId);
    api
      .delete(`/messages/comments/${activePage.page_id}/${commentFbId}/like/`)
      .then(() => {
        setComments((prev) =>
          prev.map((c) =>
            c.facebook_comment_id === commentFbId
              ? { ...c, like_count: Math.max(0, c.like_count - 1) }
              : c
          )
        );
      })
      .catch(() => {})
      .finally(() => setLikingCommentId(null));
  };

  const handleReply = (commentFbId: string) => {
    if (!activePage || !replyText.trim()) return;
    setSendingReply(true);
    api
      .post(`/messages/comments/${activePage.page_id}/${commentFbId}/reply/`, { message: replyText })
      .then(() => {
        setReplyText("");
        setReplyingTo(null);
        fetchComments();
      })
      .catch(() => {})
      .finally(() => setSendingReply(false));
  };

  const handleViewMessages = (convo: Conversation) => {
    setSelectedConvo(convo);
    setLoadingMessages(true);
    api
      .get(`/messages/conversations/${activePage?.page_id}/${convo.facebook_conversation_id}/messages/`)
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
      .then(() => setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))))
      .catch(() => {});
  };

  const handleMarkAllRead = () => {
    api
      .post("/messages/notifications/read-all/")
      .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true }))))
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
      <div className="space-y-8">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-card-border bg-card-bg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <p className="mt-1 text-sm text-text-secondary">Comments, conversations, and notifications</p>
      </div>

      {pages.length > 0 && activeTab !== "notifications" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Page:</span>
          <select
            value={activePage?.id || ""}
            onChange={(e) => {
              const p = pages.find((pg) => pg.id === Number(e.target.value));
              if (p) setActivePage(p);
            }}
            className="rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-sm shadow-sm outline-none focus:border-primary"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-card-border bg-card-bg p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.key === "notifications" && unreadCount > 0 && (
              <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Comments Tab */}
      {activeTab === "comments" && (
        <div className="space-y-4">
          {!activePage ? (
            <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                <MessageSquare size={24} className="text-primary" />
              </div>
              <p className="mt-4 font-semibold">No active page</p>
              <p className="mt-1 text-sm text-muted">Select a page to view comments</p>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-[13px] font-medium">Select a post</label>
                  <select
                    value={selectedPost?.id || ""}
                    onChange={(e) => {
                      const p = posts.find((post) => post.id === Number(e.target.value));
                      setSelectedPost(p || null);
                    }}
                    className="w-full rounded-xl border border-card-border bg-card-bg px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-primary"
                  >
                    <option value="">Choose a post...</option>
                    {posts
                      .filter((p) => p.facebook_post_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.content.slice(0, 80)}{p.content.length > 80 ? "..." : ""}
                        </option>
                      ))}
                  </select>
                </div>
                {selectedPost?.facebook_post_id && (
                  <button
                    onClick={handleSyncComments}
                    disabled={syncingComments}
                    className="flex items-center gap-2 rounded-xl border border-card-border bg-card-bg px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-surface-hover disabled:opacity-50"
                  >
                    <RefreshCw
                      size={14}
                      className={syncingComments ? "animate-spin" : ""}
                    />
                    {syncingComments ? "Syncing..." : "Sync Comments"}
                  </button>
                )}
              </div>

              {selectedPost && loadingComments && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 animate-pulse rounded-2xl border border-card-border bg-card-bg" />
                  ))}
                </div>
              )}

              {selectedPost && !loadingComments && comments.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-10 text-center">
                  <MessageSquare size={28} className="mx-auto text-muted" />
                  <p className="mt-3 font-medium">No comments</p>
                  <p className="mt-1 text-sm text-muted">
                    Try syncing comments from Facebook
                  </p>
                </div>
              )}

              {selectedPost && !loadingComments && comments.length > 0 && (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`rounded-2xl border border-card-border bg-card-bg p-4 shadow-[var(--card-shadow)] ${comment.is_reply ? "ml-10" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{comment.from_name}</p>
                          <p className="mt-1 text-sm leading-relaxed">{comment.message}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                            <span>{new Date(comment.created_at).toLocaleString()}</span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp size={11} />
                              {comment.like_count} likes
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => handleLikeComment(comment.facebook_comment_id)}
                            disabled={likingCommentId === comment.facebook_comment_id}
                            className="rounded-xl p-2 text-muted hover:bg-primary-light hover:text-primary disabled:opacity-50"
                            title="Like"
                          >
                            <ThumbsUp size={14} />
                          </button>
                          {!comment.is_reply && (
                            <button
                              onClick={() =>
                                setReplyingTo(replyingTo === comment.facebook_comment_id ? null : comment.facebook_comment_id)
                              }
                              className="rounded-xl p-2 text-muted hover:bg-surface-hover hover:text-foreground"
                            >
                              <Reply size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      {replyingTo === comment.facebook_comment_id && (
                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 rounded-xl border border-card-border bg-background px-3.5 py-2 text-sm outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => handleReply(comment.facebook_comment_id)}
                            disabled={sendingReply || !replyText.trim()}
                            className="rounded-xl bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
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
            <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                <Mail size={24} className="text-primary" />
              </div>
              <p className="mt-4 font-semibold">No active page</p>
              <p className="mt-1 text-sm text-muted">Select a page to view conversations</p>
            </div>
          ) : selectedConvo ? (
            <div className="space-y-4">
              <button
                onClick={() => { setSelectedConvo(null); setMessages([]); }}
                className="text-sm font-medium text-primary hover:underline"
              >
                &larr; Back to conversations
              </button>
              <div className="rounded-2xl border border-card-border bg-card-bg p-4 shadow-[var(--card-shadow)]">
                <p className="font-semibold">{selectedConvo.participant_name}</p>
                <p className="text-xs text-muted">{selectedConvo.message_count} messages</p>
              </div>

              {loadingMessages ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-2xl border border-card-border bg-card-bg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className="rounded-2xl border border-card-border bg-card-bg p-4 shadow-[var(--card-shadow)]">
                      <p className="text-xs font-semibold text-text-secondary">{msg.from_name}</p>
                      <p className="mt-1 text-sm">{msg.message}</p>
                      <p className="mt-1.5 text-[11px] text-muted">{new Date(msg.created_time).toLocaleString()}</p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted">No messages in this conversation</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  className="flex-1 rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">
                  {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={handleSyncConversations}
                  disabled={syncingConversations}
                  className="flex items-center gap-2 rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-medium shadow-sm hover:bg-surface-hover disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={syncingConversations ? "animate-spin" : ""}
                  />
                  {syncingConversations ? "Syncing..." : "Sync Conversations"}
                </button>
              </div>

              {conversations.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                    <Mail size={24} className="text-primary" />
                  </div>
                  <p className="mt-4 font-semibold">No conversations</p>
                  <p className="mt-1 text-sm text-muted">
                    Try syncing conversations from Facebook
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversations.map((convo) => (
                    <button
                      key={convo.id}
                      onClick={() => handleViewMessages(convo)}
                      className="w-full rounded-2xl border border-card-border bg-card-bg p-4 text-left shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] hover:border-primary/20"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{convo.participant_name}</p>
                        <span className="text-xs text-muted">{new Date(convo.updated_time).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{convo.message_count} messages</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="space-y-4">
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <button onClick={handleMarkAllRead} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <CheckCheck size={14} />
                Mark all as read
              </button>
            </div>
          )}

          {loadingNotifications ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-card-border bg-card-bg" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                <Bell size={24} className="text-primary" />
              </div>
              <p className="mt-4 font-semibold">No notifications</p>
              <p className="mt-1 text-sm text-muted">You&apos;re all caught up</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`rounded-2xl border bg-card-bg p-4 shadow-[var(--card-shadow)] ${
                    !notif.is_read ? "border-l-[3px] border-l-primary border-card-border" : "border-card-border"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold">{notif.title}</p>
                      <p className="mt-1 text-sm text-text-secondary">{notif.body}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                        <span className="rounded-md bg-surface-hover px-2 py-0.5 font-medium">{notif.notification_type}</span>
                        <span>{new Date(notif.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-light"
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
