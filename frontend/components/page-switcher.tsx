"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import type { FacebookPage } from "@/lib/types";
import { ChevronDown, Globe, Check } from "lucide-react";

export default function PageSwitcher() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/pages/")
      .then((res) => {
        const list: FacebookPage[] = res.data.results || res.data;
        setPages(list);
        const active = list.find((p) => p.is_active);
        if (active) setActivePage(active);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (page: FacebookPage) => {
    try { await api.post(`/pages/${page.page_id}/activate/`); setActivePage(page); }
    catch { /* silent */ }
    setOpen(false);
  };

  if (pages.length === 0) {
    return <span className="text-sm text-muted">No pages connected</span>;
  }

  const PageAvatar = ({ page, size = "sm" }: { page: FacebookPage; size?: "sm" | "md" }) => {
    const cls = size === "md" ? "h-8 w-8 rounded-lg" : "h-6 w-6 rounded-md";
    return page.picture_url ? (
      <img src={page.picture_url} alt={page.name} className={`${cls} shrink-0 object-cover`} />
    ) : (
      <div className={`${cls} shrink-0 flex items-center justify-center bg-primary-light`}>
        <Globe size={size === "md" ? 14 : 11} className="text-primary" />
      </div>
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-xl border border-card-border bg-card-bg px-3 py-2 text-sm shadow-sm hover:border-primary/30 hover:bg-surface-hover"
      >
        <PageAvatar page={activePage || pages[0]} />
        <span className="max-w-[140px] truncate font-medium text-[13px]">
          {activePage?.name || "Select a page"}
        </span>
        {/* Active dot */}
        {activePage && (
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
        )}
        <ChevronDown
          size={13}
          className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <div className="border-b border-border-light bg-surface-hover px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              Your Pages · {pages.length}
            </p>
          </div>
          <div className="py-1.5">
            {pages.map((page) => {
              const isSelected = page.id === activePage?.id;
              return (
                <button
                  key={page.id}
                  onClick={() => handleSelect(page)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-surface-hover ${
                    isSelected ? "bg-primary-light" : ""
                  }`}
                >
                  <PageAvatar page={page} size="md" />
                  <div className="min-w-0 flex-1 text-left">
                    <p className={`truncate text-[13px] font-semibold ${isSelected ? "text-primary" : ""}`}>
                      {page.name}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                      {page.is_active && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                      {page.category || "Facebook Page"}
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
