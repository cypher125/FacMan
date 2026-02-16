"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  MessageSquare,
  Calendar,
  Globe,
  Settings,
  X,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pages", label: "Pages", icon: Globe },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/scheduler", label: "Scheduler", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-sidebar-bg transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo area */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-primary">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              FacMan
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-sidebar-text hover:bg-sidebar-surface hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-white/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-sidebar-surface text-sidebar-active"
                    : "text-sidebar-text hover:bg-sidebar-surface hover:text-sidebar-active"
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-accent" />
                )}
                <item.icon
                  size={18}
                  className={
                    isActive
                      ? "text-sidebar-accent"
                      : "text-sidebar-text group-hover:text-sidebar-active"
                  }
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="mx-4 border-t border-white/[0.06]" />
        <div className="p-4">
          <div className="rounded-lg bg-sidebar-surface p-3">
            <p className="text-xs font-medium text-sidebar-active">
              FacMan Pro
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-sidebar-text">
              Manage unlimited pages with advanced analytics
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
