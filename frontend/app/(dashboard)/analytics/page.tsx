"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Eye,
  Users,
  TrendingUp,
  RefreshCw,
  Download,
  Filter,
} from "lucide-react";
import api from "@/lib/api";
import { FacebookPage, PageInsight, InsightsSummary } from "@/lib/types";

const PERIODS = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "days_28", label: "28 Days" },
];

export default function AnalyticsPage() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [insights, setInsights] = useState<PageInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("");

  useEffect(() => {
    api
      .get("/pages/")
      .then((res) => {
        const list = res.data.results || res.data;
        const pageList = Array.isArray(list) ? list : [];
        setPages(pageList);
        const active = pageList.find((p: FacebookPage) => p.is_active);
        if (active) setActivePage(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activePage) return;
    setLoading(true);
    const params = filterPeriod ? `?period=${filterPeriod}` : "";
    Promise.all([
      api
        .get(`/analytics/${activePage.page_id}/summary/`)
        .catch(() => ({ data: null })),
      api
        .get(`/analytics/${activePage.page_id}/${params}`)
        .catch(() => ({ data: [] })),
    ]).then(([summaryRes, insightsRes]) => {
      setSummary(summaryRes.data);
      const list = insightsRes.data.results || insightsRes.data;
      setInsights(Array.isArray(list) ? list : []);
      setLoading(false);
    });
  }, [activePage, filterPeriod]);

  const handleSync = () => {
    if (!activePage) return;
    setSyncing(true);
    api
      .post(`/analytics/${activePage.page_id}/sync/`)
      .then(() => {
        // Refetch
        const params = filterPeriod ? `?period=${filterPeriod}` : "";
        return Promise.all([
          api
            .get(`/analytics/${activePage.page_id}/summary/`)
            .catch(() => ({ data: null })),
          api
            .get(`/analytics/${activePage.page_id}/${params}`)
            .catch(() => ({ data: [] })),
        ]);
      })
      .then(([summaryRes, insightsRes]) => {
        setSummary(summaryRes.data);
        const list = insightsRes.data.results || insightsRes.data;
        setInsights(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  };

  const exportUrl = activePage
    ? `/api/analytics/${activePage.page_id}/export/`
    : "#";

  if (loading && pages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!activePage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted">
            View insights and performance metrics
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
          <BarChart3 size={40} className="mx-auto text-muted" />
          <p className="mt-3 font-medium">No active page</p>
          <p className="mt-1 text-sm text-muted">
            Connect and activate a Facebook page to view analytics
          </p>
        </div>
      </div>
    );
  }

  const summaryStats = summary
    ? [
        {
          label: "Page Views",
          value: (summary.total_page_views || 0).toLocaleString(),
          icon: Eye,
          color: "text-blue-500",
        },
        {
          label: "Impressions",
          value: (summary.total_page_impressions || 0).toLocaleString(),
          icon: TrendingUp,
          color: "text-purple-500",
        },
        {
          label: "Engagements",
          value: (summary.total_post_engagements || 0).toLocaleString(),
          icon: BarChart3,
          color: "text-green-500",
        },
        {
          label: "New Fans",
          value: (summary.total_new_fans || 0).toLocaleString(),
          icon: Users,
          color: "text-orange-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted">
            Insights for {activePage.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            className="flex items-center gap-2 rounded-lg border border-card-border px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Download size={16} />
            Export CSV
          </a>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Insights"}
          </button>
        </div>
      </div>

      {/* Page selector */}
      {pages.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Page:</span>
          <select
            value={activePage.id}
            onChange={(e) => {
              const p = pages.find((pg) => pg.id === Number(e.target.value));
              if (p) setActivePage(p);
            }}
            className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-card-border bg-card-bg"
            />
          ))}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryStats.map((stat) => (
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
        )
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter size={16} className="text-muted" />
        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All Periods</option>
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Insights table */}
      {insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
          <BarChart3 size={40} className="mx-auto text-muted" />
          <p className="mt-3 font-medium">No insights data</p>
          <p className="mt-1 text-sm text-muted">
            Sync insights to start tracking your page performance
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-card-border bg-card-bg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border">
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Metric
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Value
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted">
                  Period
                </th>
              </tr>
            </thead>
            <tbody>
              {insights.map((insight) => (
                <tr
                  key={insight.id}
                  className="border-b border-card-border last:border-0"
                >
                  <td className="px-4 py-3 font-medium">
                    {insight.metric_type}
                  </td>
                  <td className="px-4 py-3">
                    {insight.value.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(insight.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-gray-800">
                      {insight.period}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
