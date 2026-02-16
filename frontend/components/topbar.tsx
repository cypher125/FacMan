"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Menu, LogOut, User, ChevronDown } from "lucide-react";
import PageSwitcher from "./page-switcher";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-glass-bg px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-foreground lg:hidden"
        >
          <Menu size={20} />
        </button>
        <PageSwitcher />
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-surface-hover"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-white">
            {initials}
          </div>
          <span className="hidden font-medium sm:inline">
            {user?.username || user?.email}
          </span>
          <ChevronDown size={14} className="hidden text-muted sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-card-border bg-card-bg shadow-lg">
            <div className="border-b border-border-light px-4 py-3">
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted">{user?.email}</p>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger-light"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
