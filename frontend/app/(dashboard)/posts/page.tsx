"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Trash2,
  X,
  ThumbsUp,
  MessageSquare,
  Share2,
  SlidersHorizontal,
  Clock,
  Pencil,
  RefreshCw,
  Check,
  Eye,
} from "lucide-react";
import api from "@/lib/api";
import { FacebookPage, Post } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-hover text-muted",
  scheduled: "bg-info-light text-info",
  published: "bg-success-light text-success",
  failed: "bg-danger-light text-danger",
};

const POST_TYPES = ["text", "photo", "video", "link"] as const;

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [filterStatus, setFilterStatus] = useState("");
  const [filterPageId, setFilterPageId] = useState("");

  const [formPage, setFormPage] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState<(typeof POST_TYPES)[number]>("text");
  const [formMediaUrl, setFormMediaUrl] = useState("");
  const [formScheduledTime, setFormScheduledTime] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [syncingPosts, setSyncingPosts] = useState(false);
  const [syncError, setSyncError] = useState("");

  const fetchData = () => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterPageId) params.set("page_id", filterPageId);
    const query = params.toString() ? `?${params.toString()}` : "";

    Promise.all([
      api.get(`/posts/${query}`).catch(() => ({ data: [] })),
      api.get("/pages/").catch(() => ({ data: [] })),
    ]).then(([postsRes, pagesRes]) => {
      const postList = postsRes.data.results || postsRes.data;
      const pageList = pagesRes.data.results || pagesRes.data;
      setPosts(Array.isArray(postList) ? postList : []);
      setPages(Array.isArray(pageList) ? pageList : []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterPageId]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formPage || !formContent) {
      setError("Page and content are required.");
      return;
    }
    setSubmitting(true);
    const payload: Record<string, unknown> = {
      page: Number(formPage),
      content: formContent,
      post_type: formType,
    };
    if (formMediaUrl) payload.media_urls = [formMediaUrl];
    if (formScheduledTime) {
      payload.scheduled_time = formScheduledTime;
      payload.status = "scheduled";
    }
    api
      .post("/posts/create/", payload)
      .then(() => {
        setShowForm(false);
        setFormPage("");
        setFormContent("");
        setFormType("text");
        setFormMediaUrl("");
        setFormScheduledTime("");
        fetchData();
      })
      .catch((err) => {
        setError(
          err.response?.data?.detail ||
            JSON.stringify(err.response?.data) ||
            "Failed to create post"
        );
      })
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    api
      .delete(`/posts/${id}/delete/`)
      .then(() => fetchData())
      .catch(() => {})
      .finally(() => setDeletingId(null));
  };

  const handleEditSave = (id: number) => {
    setEditError("");
    setEditSaving(true);
    api
      .patch(`/posts/${id}/update/`, { content: editContent })
      .then((res) => {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...res.data } : p))
        );
        setEditingId(null);
        setEditContent("");
      })
      .catch((err) => {
        setEditError(
          err.response?.data?.detail ||
            JSON.stringify(err.response?.data) ||
            "Failed to update post"
        );
      })
      .finally(() => setEditSaving(false));
  };

  const handleSyncPosts = () => {
    if (!filterPageId) {
      setSyncError("Select a page first to sync posts.");
      return;
    }
    setSyncError("");
    setSyncingPosts(true);
    const page = pages.find((p) => p.id === Number(filterPageId));
    if (!page) {
      setSyncError("Selected page not found.");
      setSyncingPosts(false);
      return;
    }
    api
      .post(`/posts/sync/${page.page_id}/`)
      .then(() => fetchData())
      .catch((err) => {
        setSyncError(
          err.response?.data?.detail ||
            JSON.stringify(err.response?.data) ||
            "Failed to sync posts"
        );
      })
      .finally(() => setSyncingPosts(false));
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      </div>
    );
  }

  const getPageName = (pageId: number) =>
    pages.find((p) => p.id === pageId)?.name || `Page #${pageId}`;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Create, schedule, and manage your posts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncPosts}
            disabled={syncingPosts}
            className="flex items-center gap-2 rounded-xl border border-card-border bg-card-bg px-5 py-2.5 text-sm font-medium shadow-sm hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={syncingPosts ? "animate-spin" : ""}
            />
            {syncingPosts ? "Syncing..." : "Sync Posts"}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover"
          >
            {showForm ? <X size={15} /> : <Plus size={15} />}
            {showForm ? "Cancel" : "Create Post"}
          </button>
        </div>
      </div>

      {syncError && (
        <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">
          {syncError}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
          <div className="border-b border-border-light bg-surface-hover px-5 py-3">
            <h2 className="text-sm font-semibold">New Post</h2>
          </div>
          <form onSubmit={handleCreate} className="space-y-4 p-5">
            {error && (
              <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">
                  Page
                </label>
                <select
                  value={formPage}
                  onChange={(e) => setFormPage(e.target.value)}
                  className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select a page</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">
                  Post Type
                </label>
                <select
                  value={formType}
                  onChange={(e) =>
                    setFormType(e.target.value as (typeof POST_TYPES)[number])
                  }
                  className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {POST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">
                Content
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
                placeholder="Write your post content..."
                className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">
                  Media URL
                  <span className="ml-1 text-muted">(optional)</span>
                </label>
                <input
                  type="url"
                  value={formMediaUrl}
                  onChange={(e) => setFormMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium">
                  Schedule Time
                  <span className="ml-1 text-muted">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={formScheduledTime}
                  onChange={(e) => setFormScheduledTime(e.target.value)}
                  className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Post"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SlidersHorizontal size={15} className="text-muted" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-sm shadow-sm outline-none focus:border-primary"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={filterPageId}
          onChange={(e) => setFilterPageId(e.target.value)}
          className="rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-sm shadow-sm outline-none focus:border-primary"
        >
          <option value="">All Pages</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
            <FileText size={24} className="text-primary" />
          </div>
          <p className="mt-4 font-semibold">No posts found</p>
          <p className="mt-1 text-sm text-muted">
            Create your first post to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-text-secondary">
                      {getPageName(post.page)}
                    </span>
                    <span className="text-xs text-border">|</span>
                    <span className="text-xs capitalize text-muted">
                      {post.post_type}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_STYLES[post.status] || ""
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>

                  {editingId === post.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      {editError && (
                        <div className="rounded-xl bg-danger-light p-2 text-xs text-danger">
                          {editError}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditSave(post.id)}
                          disabled={editSaving}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                        >
                          <Check size={12} />
                          {editSaving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditContent("");
                            setEditError("");
                          }}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-hover"
                        >
                          <X size={12} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed line-clamp-2">
                      {post.content}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    {post.scheduled_time && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Scheduled:{" "}
                        {new Date(post.scheduled_time).toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/posts/${post.id}`}
                    className="rounded-xl p-2.5 text-muted hover:bg-surface-hover hover:text-foreground"
                  >
                    <Eye size={15} />
                  </Link>
                  {post.status === "published" && post.facebook_post_id && (
                    <button
                      onClick={() => {
                        setEditingId(post.id);
                        setEditContent(post.content);
                        setEditError("");
                      }}
                      className="rounded-xl p-2.5 text-muted hover:bg-primary-light hover:text-primary"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="rounded-xl p-2.5 text-muted hover:bg-danger-light hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {post.status === "published" &&
                post.engagement_metrics &&
                Object.keys(post.engagement_metrics).length > 0 && (
                  <div className="mt-4 flex items-center gap-5 border-t border-border-light pt-4 text-sm text-muted">
                    <span className="flex items-center gap-1.5">
                      <ThumbsUp size={14} className="text-primary" />
                      {post.engagement_metrics.reactions ||
                        post.engagement_metrics.likes ||
                        0}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-info" />
                      {post.engagement_metrics.comments || 0}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Share2 size={14} className="text-warning" />
                      {post.engagement_metrics.shares || 0}
                    </span>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
