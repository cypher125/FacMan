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
  Sparkles,
} from "lucide-react";

const mainNav = [
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

  const NavItem = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Globe }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? "bg-white/10 text-white"
            : "text-sidebar-text hover:bg-white/[0.05] hover:text-white"
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-accent" />
        )}
        <Icon
          size={17}
          className={isActive ? "text-sidebar-accent" : "text-sidebar-text group-hover:text-white"}
        />
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col bg-sidebar-bg transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-primary shadow-lg shadow-primary/20">
              <Zap size={15} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-white">FacMan</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-sidebar-text hover:bg-white/[0.05] hover:text-white lg:hidden"
          >
            <X size={17} />
          </button>
        </div>

        <div className="mx-4 h-px bg-white/[0.06]" />

        {/* Main navigation */}
        <nav className="flex-1 px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-text/50">
            Menu
          </p>
          <div className="space-y-0.5">
            {mainNav.map((item) => <NavItem key={item.href} {...item} />)}
          </div>
        </nav>

        <div className="mx-4 h-px bg-white/[0.06]" />

        {/* Settings + promo */}
        <div className="px-3 py-3">
          <NavItem href="/settings" label="Settings" icon={Settings} />
        </div>

        <div className="mx-4 h-px bg-white/[0.06]" />

        <div className="p-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 p-3.5 ring-1 ring-white/10">
            <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-primary/10 blur-xl" />
            <div className="flex items-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                <Sparkles size={13} className="text-sidebar-accent" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-white">FacMan Pro</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-sidebar-text">
                  Unlimited pages &amp; advanced analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
