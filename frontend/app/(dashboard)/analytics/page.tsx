"use client";

import { useEffect, useState } from "react";
import { BarChart3, Eye, Users, TrendingUp, RefreshCw, Download, SlidersHorizontal } from "lucide-react";
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
    api.get("/pages/")
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
      api.get(`/analytics/${activePage.page_id}/summary/`).catch(() => ({ data: [] })),
      api.get(`/analytics/${activePage.page_id}/${params}`).catch(() => ({ data: [] })),
    ]).then(([summaryRes, insightsRes]) => {
      const arr: Array<{ metric_type: string; total: number }> = Array.isArray(summaryRes.data) ? summaryRes.data : [];
      setSummary(arr.reduce((acc, item) => ({ ...acc, [item.metric_type]: item.total ?? 0 }), {}));
      const list = insightsRes.data.results || insightsRes.data;
      setInsights(Array.isArray(list) ? list : []);
      setLoading(false);
    });
  }, [activePage, filterPeriod]);

  const handleSync = () => {
    if (!activePage) return;
    setSyncing(true);
    api.post(`/analytics/${activePage.page_id}/sync/`)
      .then(() => {
        const params = filterPeriod ? `?period=${filterPeriod}` : "";
        return Promise.all([
          api.get(`/analytics/${activePage.page_id}/summary/`).catch(() => ({ data: null })),
          api.get(`/analytics/${activePage.page_id}/${params}`).catch(() => ({ data: [] })),
        ]);
      })
      .then(([summaryRes, insightsRes]) => {
        const arr: Array<{ metric_type: string; total: number }> = Array.isArray(summaryRes.data) ? summaryRes.data : [];
        setSummary(arr.reduce((acc, item) => ({ ...acc, [item.metric_type]: item.total ?? 0 }), {}));
        const list = insightsRes.data.results || insightsRes.data;
        setInsights(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setSyncing(false));
  };

  const exportUrl = activePage ? `/api/analytics/${activePage.page_id}/export/` : "#";

  if (loading && pages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[110px] animate-pulse rounded-2xl border border-card-border bg-card-bg" />)}
        </div>
      </div>
    );
  }

  if (!activePage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">View insights and performance metrics</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
            <BarChart3 size={24} className="text-primary" />
          </div>
          <p className="mt-4 font-semibold">No active page</p>
          <p className="mt-1 text-sm text-muted">Connect and activate a Facebook page to view analytics</p>
        </div>
      </div>
    );
  }

  const statGradients = [
    "from-emerald-500 to-teal-600",
    "from-violet-500 to-purple-600",
    "from-blue-500 to-indigo-600",
    "from-amber-500 to-orange-600",
  ];

  const summaryStats = summary
    ? [
        { label: "Page Views", value: (summary["page_views_total"] || 0).toLocaleString(), icon: Eye, iconBg: "bg-primary-light" },
        { label: "Impressions", value: (summary["page_impressions"] || 0).toLocaleString(), icon: TrendingUp, iconBg: "bg-purple-500/10" },
        { label: "Engagements", value: (summary["page_engaged_users"] || 0).toLocaleString(), icon: BarChart3, iconBg: "bg-info-light" },
        { label: "New Fans", value: (summary["page_fans"] || 0).toLocaleString(), icon: Users, iconBg: "bg-warning-light" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-text-secondary">Insights for {activePage.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {pages.length > 1 && (
            <select value={activePage.id} onChange={(e) => { const p = pages.find((pg) => pg.id === Number(e.target.value)); if (p) setActivePage(p); }}
              className="rounded-xl border border-card-border bg-card-bg px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-primary"
            >
              {pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <a href={exportUrl} className="flex items-center gap-2 rounded-xl border border-card-border bg-card-bg px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-surface-hover">
            <Download size={14} />Export CSV
          </a>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing…" : "Sync"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-[110px] animate-pulse rounded-2xl border border-card-border bg-card-bg" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryStats.map((stat, idx) => (
            <div key={stat.label} className="group relative overflow-hidden rounded-2xl border border-card-border bg-card-bg p-5 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]">
              <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${statGradients[idx]}`} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-muted">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon size={18} className="text-primary" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights panel */}
      <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
        {/* Filter bar */}
        <div className="flex items-center gap-3 border-b border-border-light bg-surface-hover px-4 py-3">
          <SlidersHorizontal size={14} className="text-muted" />
          <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}
            className="rounded-xl border border-card-border bg-card-bg px-3 py-1.5 text-sm shadow-sm outline-none focus:border-primary"
          >
            <option value="">All Periods</option>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <span className="ml-auto text-xs font-medium text-muted">{insights.length} record{insights.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        {insights.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
              <BarChart3 size={24} className="text-primary" />
            </div>
            <p className="mt-4 font-semibold">No insights data</p>
            <p className="mt-1 text-sm text-muted">Sync insights to start tracking performance</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-surface-hover/50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Metric</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Value</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Period</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((insight) => (
                <tr key={insight.id} className="border-b border-border-light last:border-0 hover:bg-surface-hover">
                  <td className="px-5 py-3.5 font-medium">{insight.metric_type}</td>
                  <td className="px-5 py-3.5 font-bold text-primary">{insight.value.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-muted">{new Date(insight.date).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-medium text-text-secondary capitalize">{insight.period}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
