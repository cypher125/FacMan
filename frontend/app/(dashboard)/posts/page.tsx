"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  X,
  ThumbsUp,
  MessageSquare,
  Share2,
  Filter,
} from "lucide-react";
import api from "@/lib/api";
import { FacebookPage, Post } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  scheduled:
    "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  published:
    "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
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

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPageId, setFilterPageId] = useState("");

  // Form state
  const [formPage, setFormPage] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState<(typeof POST_TYPES)[number]>("text");
  const [formMediaUrl, setFormMediaUrl] = useState("");
  const [formScheduledTime, setFormScheduledTime] = useState("");

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      </div>
    );
  }

  const getPageName = (pageId: number) =>
    pages.find((p) => p.id === pageId)?.name || `Page #${pageId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="text-sm text-muted">
            Create, schedule, and manage your posts
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Create Post"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-card-border bg-card-bg p-5 space-y-4"
        >
          <h2 className="font-medium">New Post</h2>
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Page</label>
              <select
                value={formPage}
                onChange={(e) => setFormPage(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
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
              <label className="mb-1 block text-sm font-medium">
                Post Type
              </label>
              <select
                value={formType}
                onChange={(e) =>
                  setFormType(e.target.value as (typeof POST_TYPES)[number])
                }
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
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
            <label className="mb-1 block text-sm font-medium">Content</label>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={4}
              placeholder="Write your post content..."
              className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Media URL (optional)
              </label>
              <input
                type="url"
                value={formMediaUrl}
                onChange={(e) => setFormMediaUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Schedule Time (optional)
              </label>
              <input
                type="datetime-local"
                value={formScheduledTime}
                onChange={(e) => setFormScheduledTime(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Post"}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-muted" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
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
          className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All Pages</option>
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
          <FileText size={40} className="mx-auto text-muted" />
          <p className="mt-3 font-medium">No posts found</p>
          <p className="mt-1 text-sm text-muted">
            Create your first post to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-xl border border-card-border bg-card-bg p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted">
                      {getPageName(post.page)}
                    </span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-muted capitalize">
                      {post.post_type}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[post.status] || ""
                      }`}
                    >
                      {post.status}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2">{post.content}</p>
                  {post.scheduled_time && (
                    <p className="mt-1 text-xs text-muted">
                      Scheduled:{" "}
                      {new Date(post.scheduled_time).toLocaleString()}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    Created: {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  disabled={deletingId === post.id}
                  className="shrink-0 rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {post.status === "published" &&
                post.engagement_metrics &&
                Object.keys(post.engagement_metrics).length > 0 && (
                  <div className="mt-3 flex items-center gap-4 border-t border-card-border pt-3 text-sm text-muted">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={14} />
                      {post.engagement_metrics.reactions ||
                        post.engagement_metrics.likes ||
                        0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={14} />
                      {post.engagement_metrics.comments || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Share2 size={14} />
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
