"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import type { FacebookPage } from "@/lib/types";
import { ChevronDown, Globe } from "lucide-react";

export default function PageSwitcher() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/pages/")
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (page: FacebookPage) => {
    try {
      await api.post(`/pages/${page.page_id}/activate/`);
      setActivePage(page);
    } catch {
      // silently fail
    }
    setOpen(false);
  };

  if (pages.length === 0) {
    return (
      <span className="text-sm text-muted">No pages connected</span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-card-border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Globe size={16} className="text-primary" />
        <span className="max-w-[160px] truncate font-medium">
          {activePage?.name || "Select a page"}
        </span>
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-64 rounded-lg border border-card-border bg-card-bg py-1 shadow-lg">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => handleSelect(page)}
              className={`flex w-full items-center gap-3 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 ${
                page.id === activePage?.id ? "bg-primary-light" : ""
              }`}
            >
              <Globe size={16} className="shrink-0 text-muted" />
              <div className="text-left">
                <p className="font-medium">{page.name}</p>
                <p className="text-xs text-muted">{page.category}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
