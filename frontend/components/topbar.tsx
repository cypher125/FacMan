"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Menu, LogOut, User } from "lucide-react";
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

  return (
    <header className="flex h-16 items-center justify-between border-b border-card-border bg-card-bg px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <PageSwitcher />
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            <User size={16} />
          </div>
          <span className="hidden font-medium sm:inline">
            {user?.username || user?.email}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-card-border bg-card-bg py-1 shadow-lg">
            <div className="border-b border-card-border px-4 py-2">
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-muted">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
