"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  ThumbsUp,
  MessageSquare,
  Share2,
  FileText,
  Pencil,
  Check,
  X,
  ExternalLink,
  Image,
  Video,
  LinkIcon,
} from "lucide-react";
import api from "@/lib/api";
import { Post } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-hover text-muted",
  scheduled: "bg-info-light text-info",
  published: "bg-success-light text-success",
  failed: "bg-danger-light text-danger",
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  text: FileText,
  photo: Image,
  video: Video,
  link: LinkIcon,
};

export default function PostDetailPage() {
  const params = useParams();
  const postId = params.postId as string;

  const [post, setPost] = useState<Post & { page_name?: string; link_url?: string; published_at?: string; error_message?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/posts/${postId}/`)
      .then((res) => setPost(res.data))
      .catch((err) => {
        setError(err.response?.data?.detail || "Failed to load post");
      })
      .finally(() => setLoading(false));
  }, [postId]);

  const handleEditSave = () => {
    if (!post) return;
    setEditError("");
    setEditSaving(true);
    api
      .patch(`/posts/${post.id}/update/`, { content: editContent })
      .then((res) => {
        setPost({ ...post, ...res.data });
        setEditing(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-28 animate-pulse rounded-lg bg-card-bg" />
        <div className="h-64 animate-pulse rounded-2xl border border-card-border bg-card-bg" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-6">
        <Link
          href="/posts"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft size={14} />
          Back to Posts
        </Link>
        <div className="rounded-xl bg-danger-light p-4 text-sm text-danger">
          {error || "Post not found"}
        </div>
      </div>
    );
  }

  const TypeIcon = TYPE_ICONS[post.post_type] || FileText;

  return (
    <div className="space-y-6">
      <Link
        href="/posts"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft size={14} />
        Back to Posts
      </Link>

      {/* Post detail card */}
      <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
        <div
          className={`h-[3px] ${
            post.status === "published"
              ? "bg-gradient-to-r from-success to-primary"
              : post.status === "failed"
              ? "bg-danger"
              : post.status === "scheduled"
              ? "bg-info"
              : "bg-border"
          }`}
        />
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                <TypeIcon size={18} className="text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-secondary">
                    {post.page_name || `Page #${post.page}`}
                  </span>
                  <span
                    className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                      STATUS_STYLES[post.status] || ""
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
                <p className="text-xs capitalize text-muted">{post.post_type} post</p>
              </div>
            </div>

            {post.status === "published" && post.facebook_post_id && !editing && (
              <button
                onClick={() => {
                  setEditing(true);
                  setEditContent(post.content);
                  setEditError("");
                }}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-primary-light hover:text-primary"
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
          </div>

          {/* Content */}
          <div className="mt-5">
            {editing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {editError && (
                  <div className="rounded-xl bg-danger-light p-3 text-sm text-danger">
                    {editError}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEditSave}
                    disabled={editSaving}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    <Check size={14} />
                    {editSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditContent("");
                      setEditError("");
                    }}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-muted hover:bg-surface-hover"
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {post.content}
              </p>
            )}
          </div>

          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted">Media</p>
              <div className="flex flex-wrap gap-2">
                {post.media_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-2 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink size={11} />
                    Media {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Link URL */}
          {post.link_url && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-muted">Link</p>
              <a
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink size={13} />
                {post.link_url}
              </a>
            </div>
          )}

          {/* Error message */}
          {post.error_message && (
            <div className="mt-4 rounded-xl bg-danger-light p-3 text-sm text-danger">
              {post.error_message}
            </div>
          )}

          {/* Metadata */}
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border-light pt-5 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium text-muted">Created</p>
              <p className="mt-0.5 text-sm">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
            {post.scheduled_time && (
              <div>
                <p className="text-[11px] font-medium text-muted">Scheduled</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm">
                  <Clock size={12} className="text-info" />
                  {new Date(post.scheduled_time).toLocaleString()}
                </p>
              </div>
            )}
            {post.published_at && (
              <div>
                <p className="text-[11px] font-medium text-muted">Published</p>
                <p className="mt-0.5 text-sm">
                  {new Date(post.published_at).toLocaleString()}
                </p>
              </div>
            )}
            {post.facebook_post_id && (
              <div>
                <p className="text-[11px] font-medium text-muted">Facebook ID</p>
                <p className="mt-0.5 truncate text-sm text-text-secondary">
                  {post.facebook_post_id}
                </p>
              </div>
            )}
          </div>

          {/* Engagement */}
          {post.status === "published" &&
            post.engagement_metrics &&
            Object.keys(post.engagement_metrics).length > 0 && (
              <div className="mt-5 border-t border-border-light pt-5">
                <p className="mb-3 text-xs font-medium text-muted">Engagement</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl bg-primary-light p-3 text-center">
                    <ThumbsUp size={16} className="mx-auto text-primary" />
                    <p className="mt-1 text-lg font-bold">
                      {(
                        post.engagement_metrics.reactions ||
                        post.engagement_metrics.likes ||
                        0
                      ).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted">Reactions</p>
                  </div>
                  <div className="rounded-xl bg-info-light p-3 text-center">
                    <MessageSquare size={16} className="mx-auto text-info" />
                    <p className="mt-1 text-lg font-bold">
                      {(post.engagement_metrics.comments || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted">Comments</p>
                  </div>
                  <div className="rounded-xl bg-warning-light p-3 text-center">
                    <Share2 size={16} className="mx-auto text-warning" />
                    <p className="mt-1 text-lg font-bold">
                      {(post.engagement_metrics.shares || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted">Shares</p>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
