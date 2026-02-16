"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import type { FacebookPage, Post } from "@/lib/types";
import {
  Globe,
  FileText,
  Users,
  TrendingUp,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface StatsCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
}

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

  const stats: StatsCard[] = [
    {
      label: "Connected Pages",
      value: pages.length,
      icon: Globe,
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-primary-light",
    },
    {
      label: "Total Followers",
      value: totalFans.toLocaleString(),
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      iconBg: "bg-info-light",
    },
    {
      label: "Published Posts",
      value: publishedPosts,
      icon: FileText,
      gradient: "from-violet-500 to-purple-600",
      iconBg: "bg-purple-500/10",
    },
    {
      label: "Scheduled",
      value: scheduledPosts,
      icon: TrendingUp,
      gradient: "from-amber-500 to-orange-600",
      iconBg: "bg-warning-light",
    },
  ];

  const recentPosts = posts.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back
          {user?.first_name ? `, ${user.first_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Here&apos;s an overview of your Facebook pages and content
        </p>
      </div>

      {/* Stats cards */}
      {loadingData ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-2xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border border-card-border bg-card-bg p-5 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]"
            >
              {/* Subtle gradient accent at top */}
              <div
                className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${stat.gradient}`}
              />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}
                >
                  <stat.icon size={19} className="text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pages section */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Pages</h2>
            <Link
              href="/pages"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {pages.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light">
                <Globe size={22} className="text-primary" />
              </div>
              <p className="mt-4 font-medium">No pages connected yet</p>
              <p className="mt-1 text-sm text-muted">
                Connect your Facebook pages to get started
              </p>
              <Link
                href="/pages"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                <Globe size={15} />
                Connect Pages
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="group rounded-2xl border border-card-border bg-card-bg p-5 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]"
                >
                  <div className="flex items-start gap-3">
                    {page.picture_url ? (
                      <img
                        src={page.picture_url}
                        alt={page.name}
                        className="h-10 w-10 shrink-0 rounded-xl"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light">
                        <Globe size={18} className="text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{page.name}</p>
                      <p className="text-xs text-muted">{page.category}</p>
                    </div>
                    {page.is_active && (
                      <span className="flex items-center gap-1 rounded-full bg-success-light px-2.5 py-1 text-xs font-medium text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-sm text-muted">
                    <Users size={14} />
                    <span>
                      {(page.fan_count || 0).toLocaleString()} followers
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent posts */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Posts</h2>
            <Link
              href="/posts"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowUpRight size={14} />
            </Link>
          </div>
          {recentPosts.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-8 text-center">
              <FileText size={28} className="mx-auto text-muted" />
              <p className="mt-3 text-sm font-medium">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border border-card-border bg-card-bg p-4 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]"
                >
                  <p className="line-clamp-2 text-sm">{post.content}</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        post.status === "published"
                          ? "bg-success-light text-success"
                          : post.status === "scheduled"
                            ? "bg-info-light text-info"
                            : post.status === "failed"
                              ? "bg-danger-light text-danger"
                              : "bg-surface-hover text-muted"
                      }`}
                    >
                      {post.status}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                      <Clock size={11} />
                      {new Date(post.created_at).toLocaleDateString()}
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
