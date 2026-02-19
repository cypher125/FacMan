"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Menu, LogOut, ChevronDown, Sun, Moon, Monitor, Settings } from "lucide-react";
import PageSwitcher from "./page-switcher";
import { useTheme, type Theme } from "@/lib/theme";
import Link from "next/link";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const THEME_CYCLE: Theme[] = ["light", "dark", "system"];
  const cycleTheme = () => {
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(theme) + 1) % THEME_CYCLE.length];
    setTheme(next);
  };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const themeLabel = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ""}`.toUpperCase()
    : user?.username?.[0]?.toUpperCase() || "U";

  const displayName = user?.first_name
    ? `${user.first_name}${user.last_name ? ` ${user.last_name}` : ""}`
    : user?.username || user?.email || "";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-glass-bg px-4 backdrop-blur-xl lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-muted hover:bg-surface-hover hover:text-foreground lg:hidden"
        >
          <Menu size={19} />
        </button>
        <PageSwitcher />
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          title={`Theme: ${themeLabel} — click to cycle`}
          className="flex items-center gap-1.5 rounded-xl border border-card-border bg-card-bg px-3 py-2 text-sm font-medium text-muted shadow-sm hover:bg-surface-hover hover:text-foreground"
        >
          <ThemeIcon size={14} />
          <span className="hidden sm:inline text-xs">{themeLabel}</span>
        </button>

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-border" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-surface-hover"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-white ring-2 ring-primary/20">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-semibold leading-none">{displayName}</p>
              <p className="mt-0.5 text-[11px] leading-none text-muted">{user?.email}</p>
            </div>
            <ChevronDown
              size={13}
              className={`hidden text-muted transition-transform duration-200 sm:block ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
              {/* User info header */}
              <div className="flex items-center gap-3 border-b border-border-light px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-1.5 space-y-0.5">
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover"
                >
                  <Settings size={14} className="text-muted" />
                  Settings
                </Link>
                <div className="my-1 border-t border-border-light" />
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-light"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
