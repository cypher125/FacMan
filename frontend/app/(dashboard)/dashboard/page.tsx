"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import type { FacebookPage, Post } from "@/lib/types";
import { Globe, FileText, Users, ArrowUpRight, Clock, CheckCircle, CalendarClock } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/pages/").catch(() => ({ data: [] })),
      api.get("/posts/").catch(() => ({ data: [] })),
    ]).then(([pagesRes, postsRes]) => {
      const pageList = pagesRes.data.results || pagesRes.data;
      const postList = postsRes.data.results || postsRes.data;
      setPages(Array.isArray(pageList) ? pageList : []);
      setPosts(Array.isArray(postList) ? postList : []);
      setLoadingData(false);
    });
  }, []);

  const totalFans = pages.reduce((sum, p) => sum + (p.fan_count || 0), 0);
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const scheduledPosts = posts.filter((p) => p.status === "scheduled").length;
  const recentPosts = posts.slice(0, 6);

  const stats = [
    { label: "Connected Pages", value: pages.length, icon: Globe, gradient: "from-emerald-500 to-teal-600", iconBg: "bg-primary-light", href: "/pages" },
    { label: "Total Followers", value: totalFans.toLocaleString(), icon: Users, gradient: "from-blue-500 to-indigo-600", iconBg: "bg-info-light", href: "/pages" },
    { label: "Published Posts", value: publishedPosts, icon: CheckCircle, gradient: "from-violet-500 to-purple-600", iconBg: "bg-purple-500/10", href: "/posts" },
    { label: "Scheduled", value: scheduledPosts, icon: CalendarClock, gradient: "from-amber-500 to-orange-600", iconBg: "bg-warning-light", href: "/scheduler" },
  ];

  const initials = user?.first_name
    ? `${user.first_name[0]}${user.last_name?.[0] || ""}`.toUpperCase()
    : user?.username?.[0]?.toUpperCase() || "U";

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-base font-bold text-white shadow-sm">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back{user?.first_name ? `, ${user.first_name}` : ""}
            </h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Here&apos;s an overview of your Facebook pages and content
            </p>
          </div>
        </div>
        <Link href="/posts" className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover sm:flex">
          <FileText size={15} />
          Create Post
        </Link>
      </div>

      {/* Stats */}
      {loadingData ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[110px] animate-pulse rounded-2xl border border-card-border bg-card-bg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}
              className="group relative overflow-hidden rounded-2xl border border-card-border bg-card-bg p-5 shadow-[var(--card-shadow)] transition-shadow hover:shadow-[var(--card-shadow-hover)]"
            >
              <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${stat.gradient}`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon size={18} className="text-primary" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pages section */}
        <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border-light bg-surface-hover px-5 py-3.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Your Pages · {pages.length}</span>
            <Link href="/pages" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {loadingData ? (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-hover" />)}
            </div>
          ) : pages.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light">
                <Globe size={20} className="text-primary" />
              </div>
              <p className="mt-3 font-medium">No pages connected yet</p>
              <p className="mt-1 text-sm text-muted">Connect your Facebook pages to get started</p>
              <Link href="/pages" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover">
                <Globe size={14} />Connect Pages
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              {pages.map((page) => (
                <Link key={page.id} href={`/pages/${page.page_id}`}
                  className="group flex items-start gap-3 rounded-xl border border-border-light p-3.5 transition-colors hover:bg-surface-hover"
                >
                  {page.picture_url ? (
                    <img src={page.picture_url} alt={page.name} className="h-10 w-10 shrink-0 rounded-xl" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light">
                      <Globe size={16} className="text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold group-hover:text-primary">{page.name}</p>
                    <p className="text-xs text-muted">{page.category}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                      <Users size={11} />
                      {(page.fan_count || 0).toLocaleString()}
                      {page.is_active && (
                        <span className="ml-1 flex items-center gap-1 rounded-full bg-success-light px-2 py-0.5 text-[10px] font-medium text-success">
                          <span className="h-1 w-1 rounded-full bg-success" />Active
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent posts */}
        <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
          <div className="flex items-center justify-between border-b border-border-light bg-surface-hover px-5 py-3.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Recent Posts</span>
            <Link href="/posts" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {loadingData ? (
            <div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-border-light px-4 py-3">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-surface-hover" />
                  <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded bg-surface-hover" />
                </div>
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="p-8 text-center">
              <FileText size={24} className="mx-auto text-muted" />
              <p className="mt-3 text-sm font-medium">No posts yet</p>
              <p className="mt-1 text-xs text-muted">Create your first post</p>
            </div>
          ) : (
            <div>
              {recentPosts.map((post) => (
                <div key={post.id} className="border-b border-border-light px-4 py-3 last:border-0 hover:bg-surface-hover">
                  <p className="line-clamp-1 text-[13px] leading-snug">{post.content || "(no text)"}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                      post.status === "published" ? "bg-success-light text-success"
                      : post.status === "scheduled" ? "bg-info-light text-info"
                      : post.status === "failed" ? "bg-danger-light text-danger"
                      : "bg-surface-hover text-muted"
                    }`}>{post.status}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                      <Clock size={10} />{new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
