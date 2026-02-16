"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, RefreshCw, Power, Users, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { FacebookPage } from "@/lib/types";

export default function PagesPage() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchPages = () => {
    api
      .get("/pages/")
      .then((res) => {
        const list = res.data.results || res.data;
        setPages(Array.isArray(list) ? list : []);
      })
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleSync = () => {
    setSyncing(true);
    api
      .post("/pages/sync/")
      .then(() => fetchPages())
      .catch(() => {})
      .finally(() => setSyncing(false));
  };

  const handleToggleActive = (page: FacebookPage) => {
    setTogglingId(page.id);
    api
      .post(`/pages/${page.page_id}/activate/`)
      .then(() => fetchPages())
      .catch(() => {})
      .finally(() => setTogglingId(null));
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-[180px] animate-pulse rounded-2xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facebook Pages</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your connected Facebook pages
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync Pages"}
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
            <Globe size={24} className="text-primary" />
          </div>
          <p className="mt-4 font-semibold">No pages connected</p>
          <p className="mt-1 text-sm text-muted">
            Connect your Facebook account and sync your pages to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="group relative overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]"
            >
              {/* Top accent */}
              <div
                className={`h-[3px] ${
                  page.is_active
                    ? "bg-gradient-to-r from-primary to-accent"
                    : "bg-border"
                }`}
              />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  {page.picture_url ? (
                    <img
                      src={page.picture_url}
                      alt={page.name}
                      className="h-11 w-11 shrink-0 rounded-xl"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light">
                      <Globe size={18} className="text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/pages/${page.page_id}`}
                      className="truncate font-semibold hover:text-primary hover:underline"
                    >
                      {page.name}
                    </Link>
                    <p className="text-xs text-muted">{page.category}</p>
                  </div>
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

                <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                  <Users size={14} />
                  <span>
                    {(page.fan_count || 0).toLocaleString()} followers
                  </span>
                </div>

                {page.about && (
                  <p className="mt-3 line-clamp-2 text-[13px] text-text-secondary">
                    {page.about}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-border-light pt-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/pages/${page.page_id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View Details
                    </Link>
                    {page.link && (
                      <a
                        href={page.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-primary hover:underline"
                      >
                        <ExternalLink size={12} />
                        Facebook
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleActive(page)}
                    disabled={togglingId === page.id}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                      page.is_active
                        ? "text-muted hover:bg-surface-hover"
                        : "bg-primary text-white hover:bg-primary-hover"
                    }`}
                  >
                    <Power size={12} />
                    {page.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
