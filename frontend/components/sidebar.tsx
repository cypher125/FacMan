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
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pages", label: "Pages", icon: Globe },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/scheduler", label: "Scheduler", icon: Calendar },
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
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar-bg transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6">
          <Link href="/dashboard" className="text-xl font-bold text-white">
            FacMan
          </Link>
          <button onClick={onClose} className="text-sidebar-text lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-sidebar-active"
                    : "text-sidebar-text hover:bg-white/5 hover:text-sidebar-active"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
