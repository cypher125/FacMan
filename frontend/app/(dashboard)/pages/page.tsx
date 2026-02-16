"use client";

import { useEffect, useState } from "react";
import { Globe, RefreshCw, Power, Users } from "lucide-react";
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
      .then(() => {
        fetchPages();
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  };

  const handleToggleActive = (page: FacebookPage) => {
    setTogglingId(page.id);
    api
      .post(`/pages/${page.page_id}/activate/`)
      .then(() => {
        fetchPages();
      })
      .catch(() => {})
      .finally(() => setTogglingId(null));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facebook Pages</h1>
          <p className="text-sm text-muted">
            Manage your connected Facebook pages
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing..." : "Sync Pages"}
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
          <Globe size={40} className="mx-auto text-muted" />
          <p className="mt-3 font-medium">No pages connected</p>
          <p className="mt-1 text-sm text-muted">
            Connect your Facebook account and sync your pages to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="rounded-xl border border-card-border bg-card-bg p-5"
            >
              <div className="flex items-start gap-3">
                {page.picture_url ? (
                  <img
                    src={page.picture_url}
                    alt={page.name}
                    className="h-10 w-10 shrink-0 rounded-full"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light">
                    <Globe size={18} className="text-primary" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{page.name}</p>
                  <p className="text-xs text-muted">{page.category}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    page.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {page.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Users size={14} />
                <span>{(page.fan_count || 0).toLocaleString()} followers</span>
              </div>

              {page.about && (
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {page.about}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-card-border pt-3">
                {page.link && (
                  <a
                    href={page.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View on Facebook
                  </a>
                )}
                <button
                  onClick={() => handleToggleActive(page)}
                  disabled={togglingId === page.id}
                  className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                    page.is_active
                      ? "text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
                      : "bg-primary text-white hover:bg-primary-hover"
                  }`}
                >
                  <Power size={12} />
                  {page.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
