"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  Users,
  ExternalLink,
  Power,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Clock,
  ThumbsUp,
  MessageSquare,
  Share2,
  FileText,
} from "lucide-react";
import api from "@/lib/api";
import { FacebookPage, Post } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-hover text-muted",
  scheduled: "bg-info-light text-info",
  published: "bg-success-light text-success",
  failed: "bg-danger-light text-danger",
};

export default function PageDetailPage() {
  const params = useParams();
  const pageId = params.pageId as string;

  const [page, setPage] = useState<FacebookPage | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);
  const [syncingPosts, setSyncingPosts] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchPage = () => {
    api
      .get(`/pages/${pageId}/`)
      .then((res) => {
        setPage(res.data);
        return res.data;
      })
      .then((pageData) => {
        return api
          .get(`/posts/?page_id=${pageData.page_id}`)
          .then((res) => {
            const list = res.data.results || res.data;
            setPosts(Array.isArray(list) ? list : []);
          })
          .catch(() => setPosts([]));
      })
      .catch((err) => {
        setError(
          err.response?.data?.detail || "Failed to load page details"
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const handleToggleActive = () => {
    if (!page) return;
    setToggling(true);
    api
      .post(`/pages/${page.page_id}/activate/`)
      .then(() => fetchPage())
      .catch(() => {})
      .finally(() => setToggling(false));
  };

  const handleSyncPosts = () => {
    if (!page) return;
    setSyncError("");
    setSyncingPosts(true);
    api
      .post(`/posts/sync/${page.page_id}/`)
      .then(() => {
        return api
          .get(`/posts/?page_id=${page.page_id}`)
          .then((res) => {
            const list = res.data.results || res.data;
            setPosts(Array.isArray(list) ? list : []);
          });
      })
      .catch((err) => {
        setSyncError(
          err.response?.data?.detail ||
            JSON.stringify(err.response?.data) ||
            "Failed to sync posts"
        );
      })
      .finally(() => setSyncingPosts(false));
  };

  const handleDeletePost = (id: number) => {
    setDeletingId(id);
    api
      .delete(`/posts/${id}/delete/`)
      .then(() => setPosts((prev) => prev.filter((p) => p.id !== id)))
      .catch(() => {})
      .finally(() => setDeletingId(null));
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-6 w-32 animate-pulse rounded-lg bg-card-bg" />
        <div className="h-64 animate-pulse rounded-2xl border border-card-border bg-card-bg" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="space-y-6">
        <Link
          href="/pages"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft size={14} />
          Back to Pages
        </Link>
        <div className="rounded-xl bg-danger-light p-4 text-sm text-danger">
          {error || "Page not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link
        href="/pages"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft size={14} />
        Back to Pages
      </Link>

      {/* Page detail card */}
      <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
        <div
          className={`h-[3px] ${
            page.is_active
              ? "bg-gradient-to-r from-primary to-accent"
              : "bg-border"
          }`}
        />
        <div className="p-6">
          <div className="flex items-start gap-4">
            {page.picture_url ? (
              <img
                src={page.picture_url}
                alt={page.name}
                className="h-16 w-16 shrink-0 rounded-xl"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-light">
                <Globe size={24} className="text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {page.name}
                </h1>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    page.is_active
                      ? "bg-success-light text-success"
                      : "bg-surface-hover text-muted"
                  }`}
                >
                  {page.is_active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  )}
                  {page.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{page.category}</p>
            </div>
            <button
              onClick={handleToggleActive}
              disabled={toggling}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 ${
                page.is_active
                  ? "border border-card-border text-muted hover:bg-surface-hover"
                  : "bg-primary text-white hover:bg-primary-hover"
              }`}
            >
              <Power size={14} />
              {page.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm text-muted">
            <Users size={14} />
            <span>
              {(page.fan_count || 0).toLocaleString()} followers
            </span>
          </div>

          {page.about && (
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {page.about}
            </p>
          )}

          {page.link && (
            <a
              href={page.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ExternalLink size={14} />
              View on Facebook
            </a>
          )}
        </div>
      </div>

      {/* Posts section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Posts</h2>
          <button
            onClick={handleSyncPosts}
            disabled={syncingPosts}
            className="flex items-center gap-2 rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-medium shadow-sm hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={syncingPosts ? "animate-spin" : ""}
            />
            {syncingPosts ? "Syncing..." : "Sync Posts"}
          </button>
        </div>

        {syncError && (
          <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">
            {syncError}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
              <FileText size={24} className="text-primary" />
            </div>
            <p className="mt-4 font-semibold">No posts yet</p>
            <p className="mt-1 text-sm text-muted">
              Sync posts from Facebook or create a new post
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
                    <p className="text-sm leading-relaxed line-clamp-2">
                      {post.content}
                    </p>
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
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    disabled={deletingId === post.id}
                    className="shrink-0 rounded-xl p-2.5 text-muted hover:bg-danger-light hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
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
    </div>
  );
}
