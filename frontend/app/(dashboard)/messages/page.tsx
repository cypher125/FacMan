"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Mail,
  Bell,
  Send,
  CheckCheck,
  Reply,
  ThumbsUp,
  RefreshCw,
  FileText,
  Image,
  Video,
  Link2,
  ChevronRight,
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

const STATUS_DOT: Record<string, string> = {
  published: "bg-success",
  scheduled: "bg-info",
  draft: "bg-muted",
  failed: "bg-danger",
};

const POST_TYPE_ICON: Record<string, typeof FileText> = {
  text: FileText,
  photo: Image,
  video: Video,
  link: Link2,
};

function Avatar({
  name,
  size = "md",
  color = "primary",
}: {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  color?: "primary" | "surface";
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
  const sz =
    size === "xs"
      ? "h-6 w-6 text-[9px]"
      : size === "sm"
      ? "h-8 w-8 text-[11px]"
      : size === "lg"
      ? "h-11 w-11 text-sm"
      : "h-9 w-9 text-xs";
  const bg =
    color === "surface"
      ? "bg-surface-hover text-muted"
      : "bg-gradient-to-br from-primary to-accent text-white";
  return (
    <div className={`${sz} ${bg} flex shrink-0 items-center justify-center rounded-full font-semibold`}>
      {initials}
    </div>
  );
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("comments");
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Comments
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [syncingComments, setSyncingComments] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [syncingConversations, setSyncingConversations] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch pages + posts on mount ───────────────────────────
  useEffect(() => {
    Promise.all([
      api.get("/pages/").catch(() => ({ data: [] })),
      api.get("/posts/").catch(() => ({ data: [] })),
    ]).then(([pagesRes, postsRes]) => {
      const pArr = Array.isArray(pagesRes.data.results ?? pagesRes.data)
        ? (pagesRes.data.results ?? pagesRes.data)
        : [];
      const postArr = Array.isArray(postsRes.data.results ?? postsRes.data)
        ? (postsRes.data.results ?? postsRes.data)
        : [];
      setPages(pArr);
      setPosts(postArr);
      const active = pArr.find((p: FacebookPage) => p.is_active);
      if (active) setActivePage(active);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Fetch comments when post changes ───────────────────────
  const fetchComments = async (autoSync = false) => {
    if (!activePage || !selectedPost?.facebook_post_id) return;
    setLoadingComments(true);
    try {
      const res = await api.get(
        `/messages/comments/${activePage.page_id}/${selectedPost.facebook_post_id}/`
      );
      const list = res.data.results ?? res.data;
      const arr: Comment[] = Array.isArray(list) ? list : [];

      // Auto-sync if no local comments but engagement metrics say there are some on Facebook
      if (arr.length === 0 && autoSync && (selectedPost.engagement_metrics?.comments ?? 0) > 0) {
        setSyncingComments(true);
        try {
          await api.post(
            `/messages/comments/${activePage.page_id}/${selectedPost.facebook_post_id}/sync/`
          );
          const syncRes = await api.get(
            `/messages/comments/${activePage.page_id}/${selectedPost.facebook_post_id}/`
          );
          const syncList = syncRes.data.results ?? syncRes.data;
          setComments(Array.isArray(syncList) ? syncList : []);
        } catch {
          setComments([]);
        } finally {
          setSyncingComments(false);
        }
      } else {
        setComments(arr);
      }
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    fetchComments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, selectedPost]);

  // ── Fetch conversations ─────────────────────────────────────
  const fetchConversations = () => {
    if (!activePage) return;
    api
      .get(`/messages/conversations/${activePage.page_id}/`)
      .then((res) => {
        const list = res.data.results ?? res.data;
        setConversations(Array.isArray(list) ? list : []);
      })
      .catch(() => setConversations([]));
  };

  useEffect(() => {
    if (activeTab !== "conversations" || !activePage) return;
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activePage]);

  // ── Fetch notifications ─────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "notifications") return;
    setLoadingNotifications(true);
    api
      .get("/messages/notifications/")
      .then((res) => {
        const list = res.data.results ?? res.data;
        setNotifications(Array.isArray(list) ? list : []);
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifications(false));
  }, [activeTab]);

  // ── Actions ────────────────────────────────────────────────
  const handleSyncComments = () => {
    if (!activePage || !selectedPost?.facebook_post_id) return;
    setSyncingComments(true);
    api
      .post(`/messages/comments/${activePage.page_id}/${selectedPost.facebook_post_id}/sync/`)
      .then(() => fetchComments(false))
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

  const handleLikeComment = (fbId: string) => {
    if (!activePage) return;
    setLikingCommentId(fbId);
    api
      .post(`/messages/comments/${activePage.page_id}/${fbId}/like/`)
      .then(() =>
        setComments((prev) =>
          prev.map((c) =>
            c.facebook_comment_id === fbId ? { ...c, like_count: c.like_count + 1 } : c
          )
        )
      )
      .catch(() => {})
      .finally(() => setLikingCommentId(null));
  };

  const handleReply = (fbId: string) => {
    if (!activePage || !replyText.trim()) return;
    setSendingReply(true);
    api
      .post(`/messages/comments/${activePage.page_id}/${fbId}/reply/`, { message: replyText })
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
      .get(
        `/messages/conversations/${activePage?.page_id}/${convo.facebook_conversation_id}/messages/`
      )
      .then((res) => {
        const list = res.data.results ?? res.data;
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
      .then(() =>
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        )
      )
      .catch(() => {});
  };

  const handleMarkAllRead = () => {
    api
      .post("/messages/notifications/read-all/")
      .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true }))))
      .catch(() => {});
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const publishedPosts = posts.filter((p) => p.facebook_post_id);

  const tabs = [
    { key: "comments" as Tab, label: "Comments", icon: MessageSquare },
    { key: "conversations" as Tab, label: "Conversations", icon: Mail },
    { key: "notifications" as Tab, label: "Notifications", icon: Bell },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-44 animate-pulse rounded-xl bg-card-bg" />
        <div className="h-12 animate-pulse rounded-2xl bg-card-bg" />
        <div className="grid grid-cols-[280px_1fr] gap-0 overflow-hidden rounded-2xl border border-card-border">
          <div className="space-y-1 border-r border-border-light p-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-hover" />
            ))}
          </div>
          <div className="p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-hover" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="mt-1 text-sm text-text-secondary">
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
                if (p) {
                  setActivePage(p);
                  setSelectedPost(null);
                  setComments([]);
                  setSelectedConvo(null);
                  setMessages([]);
                }
              }}
              className="rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-sm shadow-sm outline-none focus:border-primary"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

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
              <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── COMMENTS TAB ──────────────────────────────────────── */}
      {activeTab === "comments" && (
        !activePage ? (
          <EmptyState icon={<MessageSquare size={24} className="text-primary" />} title="No active page" body="Select a page above to view comments" />
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
            <div className="grid h-full" style={{ gridTemplateColumns: "280px 1fr" }}>

              {/* LEFT — Post list */}
              <div className="flex min-h-0 flex-col border-r border-border-light">
                <div className="flex items-center justify-between border-b border-border-light bg-surface-hover px-3 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Posts · {publishedPosts.length}
                  </span>
                </div>

                {publishedPosts.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                    <FileText size={24} className="text-muted" />
                    <p className="text-sm font-medium text-muted">No published posts</p>
                    <p className="text-xs text-muted">Sync posts from Facebook first</p>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {publishedPosts.map((post) => {
                      const Icon = POST_TYPE_ICON[post.post_type] ?? FileText;
                      const isSelected = selectedPost?.id === post.id;
                      return (
                        <button
                          key={post.id}
                          onClick={() => setSelectedPost(isSelected ? null : post)}
                          className={`group w-full border-b border-border-light px-3 py-3 text-left transition-colors last:border-0 ${
                            isSelected
                              ? "bg-primary-light"
                              : "hover:bg-surface-hover"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                              isSelected ? "bg-primary" : "bg-surface-hover group-hover:bg-border-light"
                            }`}>
                              <Icon size={13} className={isSelected ? "text-white" : "text-muted"} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-[13px] leading-snug ${isSelected ? "font-medium text-primary" : "text-foreground"}`}>
                                {post.content || "(no text)"}
                              </p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[post.status] ?? "bg-muted"}`} />
                                <span className="text-[11px] capitalize text-muted">{post.status}</span>
                                <span className="text-[11px] text-border">·</span>
                                <span className="text-[11px] text-muted">
                                  {new Date(post.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {isSelected && <ChevronRight size={13} className="mt-1 shrink-0 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT — Comments panel */}
              <div className="flex min-h-0 flex-col">
                {!selectedPost ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover">
                      <MessageSquare size={24} className="text-muted" />
                    </div>
                    <p className="font-medium">Select a post</p>
                    <p className="text-sm text-muted">Choose a post from the left to see its comments</p>
                  </div>
                ) : (
                  <>
                    {/* Comment panel header */}
                    <div className="flex items-center justify-between border-b border-border-light bg-surface-hover px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {selectedPost.content.slice(0, 60)}{selectedPost.content.length > 60 ? "…" : ""}
                        </p>
                        <p className="text-[11px] text-muted">
                          {comments.length} comment{comments.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <button
                        onClick={handleSyncComments}
                        disabled={syncingComments}
                        className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg border border-card-border bg-card-bg px-3 py-1.5 text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={syncingComments ? "animate-spin" : ""} />
                        {syncingComments ? "Syncing…" : "Sync"}
                      </button>
                    </div>

                    {/* Comments scroll area */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                      {loadingComments ? (
                        [...Array(3)].map((_, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-hover" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-24 animate-pulse rounded bg-surface-hover" />
                              <div className="h-10 animate-pulse rounded-xl bg-surface-hover" />
                            </div>
                          </div>
                        ))
                      ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <MessageSquare size={28} className="text-muted" />
                          <p className="mt-3 font-medium">No comments yet</p>
                          <p className="mt-1 text-sm text-muted">
                            {(selectedPost.engagement_metrics?.comments ?? 0) > 0
                              ? "Comments exist on Facebook but could not be synced. Try clicking Sync."
                              : "No comments on this post. Click Sync to refresh from Facebook."}
                          </p>
                        </div>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className={comment.is_reply ? "ml-10" : ""}>
                            <div className="flex gap-2.5">
                              <Avatar name={comment.from_name} size="sm" />
                              <div className="min-w-0 flex-1">
                                <div className="rounded-2xl rounded-tl-sm bg-surface px-3.5 py-2.5 border border-border-light">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-[13px] font-semibold leading-none">{comment.from_name}</p>
                                    <div className="flex shrink-0 items-center gap-0.5">
                                      <button
                                        onClick={() => handleLikeComment(comment.facebook_comment_id)}
                                        disabled={likingCommentId === comment.facebook_comment_id}
                                        title="Like"
                                        className="rounded-lg p-1 text-muted hover:bg-primary-light hover:text-primary disabled:opacity-50"
                                      >
                                        <ThumbsUp size={12} />
                                      </button>
                                      {!comment.is_reply && (
                                        <button
                                          onClick={() =>
                                            setReplyingTo(
                                              replyingTo === comment.facebook_comment_id
                                                ? null
                                                : comment.facebook_comment_id
                                            )
                                          }
                                          title="Reply"
                                          className="rounded-lg p-1 text-muted hover:bg-surface-hover hover:text-foreground"
                                        >
                                          <Reply size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                                    {comment.message}
                                  </p>
                                </div>
                                <div className="mt-1 ml-1 flex items-center gap-2 text-[11px] text-muted">
                                  <span>{new Date(comment.created_at).toLocaleString()}</span>
                                  {comment.like_count > 0 && (
                                    <span className="flex items-center gap-0.5">
                                      <ThumbsUp size={9} className="text-primary" />
                                      {comment.like_count}
                                    </span>
                                  )}
                                  {comment.is_reply && (
                                    <span className="rounded bg-surface-hover px-1.5 py-0.5 font-medium">↩ Reply</span>
                                  )}
                                </div>

                                {replyingTo === comment.facebook_comment_id && (
                                  <div className="mt-2 flex gap-2">
                                    <input
                                      autoFocus
                                      type="text"
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      onKeyDown={(e) =>
                                        e.key === "Enter" && handleReply(comment.facebook_comment_id)
                                      }
                                      placeholder={`Reply to ${comment.from_name}…`}
                                      className="flex-1 rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                    />
                                    <button
                                      onClick={() => handleReply(comment.facebook_comment_id)}
                                      disabled={sendingReply || !replyText.trim()}
                                      className="rounded-xl bg-primary px-3 py-2 text-white hover:bg-primary-hover disabled:opacity-50"
                                    >
                                      <Send size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={commentsEndRef} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* ── CONVERSATIONS TAB ──────────────────────────────────── */}
      {activeTab === "conversations" && (
        !activePage ? (
          <EmptyState icon={<Mail size={24} className="text-primary" />} title="No active page" body="Select a page above to view conversations" />
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
            <div className="grid h-full" style={{ gridTemplateColumns: "280px 1fr" }}>

              {/* LEFT — Conversation list */}
              <div className="flex min-h-0 flex-col border-r border-border-light">
                <div className="flex items-center justify-between border-b border-border-light bg-surface-hover px-3 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Chats · {conversations.length}
                  </span>
                  <button
                    onClick={handleSyncConversations}
                    disabled={syncingConversations}
                    title="Sync"
                    className="rounded-lg p-1.5 text-muted hover:bg-card-bg disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={syncingConversations ? "animate-spin" : ""} />
                  </button>
                </div>

                {conversations.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                    <Mail size={24} className="text-muted" />
                    <p className="text-sm font-medium text-muted">No conversations</p>
                    <button
                      onClick={handleSyncConversations}
                      disabled={syncingConversations}
                      className="mt-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                    >
                      Sync from Facebook
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    {conversations.map((convo) => {
                      const isSelected = selectedConvo?.id === convo.id;
                      return (
                        <button
                          key={convo.id}
                          onClick={() => handleViewMessages(convo)}
                          className={`w-full border-b border-border-light px-3 py-3 text-left transition-colors last:border-0 ${
                            isSelected ? "bg-primary-light" : "hover:bg-surface-hover"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar name={convo.participant_name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-[13px] font-semibold ${isSelected ? "text-primary" : ""}`}>
                                {convo.participant_name}
                              </p>
                              <p className="text-[11px] text-muted">
                                {convo.message_count} msg · {new Date(convo.updated_time).toLocaleDateString()}
                              </p>
                            </div>
                            {isSelected && <ChevronRight size={13} className="shrink-0 text-primary" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGHT — Chat view */}
              <div className="flex min-h-0 flex-col">
                {!selectedConvo ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover">
                      <Mail size={24} className="text-muted" />
                    </div>
                    <p className="font-medium">Select a conversation</p>
                    <p className="text-sm text-muted">Choose a chat from the left to open it</p>
                  </div>
                ) : (
                  <>
                    {/* Chat header */}
                    <div className="flex items-center gap-3 border-b border-border-light bg-surface-hover px-4 py-3">
                      <Avatar name={selectedConvo.participant_name} size="sm" />
                      <div>
                        <p className="text-sm font-semibold">{selectedConvo.participant_name}</p>
                        <p className="text-[11px] text-muted">{selectedConvo.message_count} messages</p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-3 p-4">
                      {loadingMessages ? (
                        [...Array(4)].map((_, i) => (
                          <div key={i} className={`flex ${i % 2 === 0 ? "" : "justify-end"}`}>
                            <div className={`h-10 w-48 animate-pulse rounded-2xl bg-surface-hover`} />
                          </div>
                        ))
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Mail size={28} className="text-muted" />
                          <p className="mt-3 text-sm font-medium text-muted">No messages yet</p>
                        </div>
                      ) : (
                        messages.map((msg) => {
                          const isPage = msg.from_id === activePage?.page_id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex items-end gap-2 ${isPage ? "flex-row-reverse" : "flex-row"}`}
                            >
                              {!isPage && <Avatar name={msg.from_name} size="xs" />}
                              <div className={`flex max-w-[72%] flex-col gap-1 ${isPage ? "items-end" : "items-start"}`}>
                                {!isPage && (
                                  <p className="ml-1 text-[11px] font-medium text-muted">{msg.from_name}</p>
                                )}
                                <div
                                  className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                    isPage
                                      ? "rounded-br-sm bg-primary text-white"
                                      : "rounded-bl-sm border border-border-light bg-surface text-foreground"
                                  }`}
                                >
                                  {msg.message}
                                </div>
                                <p className="mx-1 text-[10px] text-muted">
                                  {new Date(msg.created_time).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message input */}
                    <div className="border-t border-border-light bg-surface-hover p-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message…"
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                          className="flex-1 rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !newMessage.trim()}
                          className="rounded-xl bg-primary px-4 text-white hover:bg-primary-hover disabled:opacity-50"
                        >
                          <Send size={15} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      )}

      {/* ── NOTIFICATIONS TAB ─────────────────────────────────── */}
      {activeTab === "notifications" && (
        <div className="space-y-3">
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
            </div>
          )}

          {loadingNotifications ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-card-border bg-card-bg" />
            ))
          ) : notifications.length === 0 ? (
            <EmptyState icon={<Bell size={24} className="text-primary" />} title="All caught up" body="No notifications right now" />
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`flex items-start gap-4 rounded-2xl border bg-card-bg p-4 shadow-[var(--card-shadow)] ${
                  !notif.is_read
                    ? "border-l-[3px] border-l-primary border-card-border"
                    : "border-card-border opacity-60"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  !notif.is_read ? "bg-primary-light" : "bg-surface-hover"
                }`}>
                  <Bell size={15} className={!notif.is_read ? "text-primary" : "text-muted"} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{notif.title}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">{notif.body}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                    <span className="rounded-md bg-surface-hover px-2 py-0.5 font-medium capitalize">
                      {notif.notification_type}
                    </span>
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
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
        {icon}
      </div>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  );
}
