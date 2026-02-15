"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import type { FacebookPage, Post } from "@/lib/types";
import { Globe, FileText, Users, TrendingUp } from "lucide-react";

interface StatsCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
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

  const stats: StatsCard[] = [
    {
      label: "Connected Pages",
      value: pages.length,
      icon: Globe,
      color: "text-blue-500",
    },
    {
      label: "Total Followers",
      value: totalFans.toLocaleString(),
      icon: Users,
      color: "text-green-500",
    },
    {
      label: "Published Posts",
      value: publishedPosts,
      icon: FileText,
      color: "text-purple-500",
    },
    {
      label: "Scheduled",
      value: posts.filter((p) => p.status === "scheduled").length,
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{user?.first_name ? `, ${user.first_name}` : ""}
        </h1>
        <p className="text-sm text-muted">
          Here&apos;s an overview of your Facebook pages
        </p>
      </div>

      {/* Stats cards */}
      {loadingData ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-card-border bg-card-bg p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">{stat.label}</p>
                <stat.icon size={20} className={stat.color} />
              </div>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Connected pages list */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Your Pages</h2>
        {pages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
            <Globe size={40} className="mx-auto text-muted" />
            <p className="mt-3 font-medium">No pages connected yet</p>
            <p className="mt-1 text-sm text-muted">
              Connect your Facebook pages to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <div
                key={page.id}
                className="rounded-xl border border-card-border bg-card-bg p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light">
                    <Globe size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{page.name}</p>
                    <p className="text-xs text-muted">{page.category}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted">
                    {(page.fan_count || 0).toLocaleString()} followers
                  </span>
                  {page.is_active && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
