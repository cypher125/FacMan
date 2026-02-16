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
        className="flex items-center gap-2.5 rounded-xl border border-card-border bg-card-bg px-3 py-2 text-sm shadow-sm hover:border-primary/30 hover:shadow-md"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-light">
          <Globe size={13} className="text-primary" />
        </div>
        <span className="max-w-[160px] truncate font-medium">
          {activePage?.name || "Select a page"}
        </span>
        <ChevronDown
          size={14}
          className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-72 overflow-hidden rounded-xl border border-card-border bg-card-bg py-1 shadow-lg">
          {pages.map((page) => {
            const isSelected = page.id === activePage?.id;
            return (
              <button
                key={page.id}
                onClick={() => handleSelect(page)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-surface-hover ${
                  isSelected ? "bg-primary-light" : ""
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-soft">
                  <Globe size={13} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium">{page.name}</p>
                  <p className="text-xs text-muted">{page.category}</p>
                </div>
                {isSelected && (
                  <Check size={15} className="shrink-0 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
