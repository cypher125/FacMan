"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Layers,
  Users,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  BarChart3,
  ThumbsUp,
  MessageSquare,
  Share2,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import api from "@/lib/api";
import {
  FacebookPage,
  CalendarPost,
  BulkSchedule,
  BulkScheduleItem,
  TeamMember,
  PageAnalytics,
  TopPost,
} from "@/lib/types";

type Tab = "calendar" | "bulk" | "team" | "analytics";

const ROLES = ["admin", "editor", "analyst", "viewer"] as const;

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  editor: "bg-info-light text-info",
  analyst: "bg-success-light text-success",
  viewer: "bg-surface-hover text-muted",
};

const BULK_STATUS_STYLES: Record<string, string> = {
  processing: "bg-info-light text-info",
  completed: "bg-success-light text-success",
  partial: "bg-warning-light text-warning",
  failed: "bg-danger-light text-danger",
};

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [loading, setLoading] = useState(true);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  const [bulkSchedules, setBulkSchedules] = useState<BulkSchedule[]>([]);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkName, setBulkName] = useState("");
  const [bulkItems, setBulkItems] = useState<
    { page: string; content: string; post_type: string; scheduled_time: string }[]
  >([{ page: "", content: "", post_type: "text", scheduled_time: "" }]);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [expandedBulkId, setExpandedBulkId] = useState<number | null>(null);
  const [bulkDetail, setBulkDetail] = useState<BulkSchedule | null>(null);
  const [loadingBulkDetail, setLoadingBulkDetail] = useState(false);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState<(typeof ROLES)[number]>("editor");
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);

  const [pageAnalytics, setPageAnalytics] = useState<PageAnalytics[]>([]);
  const [topPosts, setTopPosts] = useState<TopPost[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    api
      .get("/pages/")
      .then((res) => {
        const list = res.data.results || res.data;
        const pArr = Array.isArray(list) ? list : [];
        setPages(pArr);
        const active = pArr.find((p: FacebookPage) => p.is_active);
        if (active) setActivePage(active);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== "calendar") return;
    setLoadingCalendar(true);
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const start = new Date(year, month, 1).toISOString().split("T")[0];
    const end = new Date(year, month + 1, 0).toISOString().split("T")[0];
    api
      .get(`/scheduler/calendar/?start=${start}&end=${end}`)
      .then((res) => {
        const list = res.data.results || res.data;
        setCalendarPosts(Array.isArray(list) ? list : []);
      })
      .catch(() => setCalendarPosts([]))
      .finally(() => setLoadingCalendar(false));
  }, [activeTab, calendarDate]);

  useEffect(() => {
    if (activeTab !== "bulk") return;
    api
      .get("/scheduler/bulk/")
      .then((res) => {
        const list = res.data.results || res.data;
        setBulkSchedules(Array.isArray(list) ? list : []);
      })
      .catch(() => setBulkSchedules([]));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "team" || !activePage) return;
    fetchTeamMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, activePage]);

  useEffect(() => {
    if (activeTab !== "analytics") return;
    setLoadingAnalytics(true);
    Promise.all([
      api.get("/scheduler/advanced-analytics/").catch(() => ({ data: [] })),
      api.get("/scheduler/top-posts/?limit=10").catch(() => ({ data: [] })),
    ]).then(([analyticsRes, topRes]) => {
      setPageAnalytics(Array.isArray(analyticsRes.data) ? analyticsRes.data : []);
      setTopPosts(Array.isArray(topRes.data) ? topRes.data : []);
      setLoadingAnalytics(false);
    });
  }, [activeTab]);

  const fetchTeamMembers = () => {
    if (!activePage) return;
    api
      .get(`/scheduler/team/${activePage.page_id}/`)
      .then((res) => {
        const list = res.data.results || res.data;
        setTeamMembers(Array.isArray(list) ? list : []);
      })
      .catch(() => setTeamMembers([]));
  };

  const prevMonth = () =>
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () =>
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  const handleBulkCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBulk(true);
    api
      .post("/scheduler/bulk/create/", {
        name: bulkName,
        items: bulkItems.map((item) => ({ ...item, page: Number(item.page) })),
      })
      .then(() => {
        setShowBulkForm(false);
        setBulkName("");
        setBulkItems([{ page: "", content: "", post_type: "text", scheduled_time: "" }]);
        return api.get("/scheduler/bulk/");
      })
      .then((res) => {
        const list = res.data.results || res.data;
        setBulkSchedules(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setSubmittingBulk(false));
  };

  const addBulkItem = () =>
    setBulkItems([...bulkItems, { page: "", content: "", post_type: "text", scheduled_time: "" }]);
  const removeBulkItem = (index: number) =>
    setBulkItems(bulkItems.filter((_, i) => i !== index));
  const updateBulkItem = (index: number, field: string, value: string) =>
    setBulkItems(bulkItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  const handleToggleBulkDetail = (id: number) => {
    if (expandedBulkId === id) {
      setExpandedBulkId(null);
      setBulkDetail(null);
      return;
    }
    setExpandedBulkId(id);
    setLoadingBulkDetail(true);
    api
      .get(`/scheduler/bulk/${id}/`)
      .then((res) => setBulkDetail(res.data))
      .catch(() => setBulkDetail(null))
      .finally(() => setLoadingBulkDetail(false));
  };

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePage) return;
    setSubmittingTeam(true);
    api
      .post(`/scheduler/team/${activePage.page_id}/add/`, { email: teamEmail, role: teamRole })
      .then(() => {
        setShowTeamForm(false);
        setTeamEmail("");
        setTeamRole("editor");
        fetchTeamMembers();
      })
      .catch(() => {})
      .finally(() => setSubmittingTeam(false));
  };

  const handleRemoveTeamMember = (id: number) => {
    if (!activePage) return;
    setRemovingId(id);
    api
      .delete(`/scheduler/team/${activePage.page_id}/${id}/remove/`)
      .then(() => setTeamMembers((prev) => prev.filter((m) => m.id !== id)))
      .catch(() => {})
      .finally(() => setRemovingId(null));
  };

  const handleUpdateRole = (memberId: number, newRole: string) => {
    if (!activePage) return;
    setUpdatingRoleId(memberId);
    api
      .patch(`/scheduler/team/${activePage.page_id}/${memberId}/update/`, { role: newRole })
      .then((res) => {
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, ...res.data } : m))
        );
      })
      .catch(() => {})
      .finally(() => setUpdatingRoleId(null));
  };

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calendarDate.toLocaleString("default", { month: "long", year: "numeric" });

  const getPostsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarPosts.filter((p) => p.scheduled_time?.startsWith(dateStr));
  };

  const tabs: { key: Tab; label: string; icon: typeof Calendar }[] = [
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "bulk", label: "Bulk Schedule", icon: Layers },
    { key: "team", label: "Team", icon: Users },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="h-[400px] animate-pulse rounded-2xl border border-card-border bg-card-bg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Scheduler</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Calendar, bulk scheduling, team management, and analytics
        </p>
      </div>

      {activeTab === "team" && pages.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Page:</span>
          <select
            value={activePage?.id || ""}
            onChange={(e) => {
              const p = pages.find((pg) => pg.id === Number(e.target.value));
              if (p) setActivePage(p);
            }}
            className="rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-sm shadow-sm outline-none focus:border-primary"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-card-border bg-card-bg p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="rounded-xl p-2.5 hover:bg-surface-hover">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <button onClick={nextMonth} className="rounded-xl p-2.5 hover:bg-surface-hover">
              <ChevronRight size={18} />
            </button>
          </div>

          {loadingCalendar ? (
            <div className="h-[400px] animate-pulse rounded-2xl border border-card-border bg-card-bg" />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
              <div className="grid grid-cols-7 border-b border-border-light bg-surface-hover">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-muted">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {[...Array(firstDay)].map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[90px] border-b border-r border-border-light p-1.5" />
                ))}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const dayPosts = getPostsForDay(day);
                  const today = new Date();
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  return (
                    <div
                      key={day}
                      className={`min-h-[90px] border-b border-r border-border-light p-1.5 ${isToday ? "bg-primary-glow" : ""}`}
                    >
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        isToday ? "bg-primary text-white" : "text-muted"
                      }`}>
                        {day}
                      </span>
                      {dayPosts.slice(0, 2).map((post) => (
                        <div
                          key={post.id}
                          className="mt-0.5 truncate rounded-md bg-primary-light px-1.5 py-0.5 text-[10px] font-medium text-primary"
                          title={post.content}
                        >
                          {post.content.slice(0, 20)}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <p className="mt-0.5 text-[10px] font-medium text-muted">+{dayPosts.length - 2} more</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk Schedule Tab */}
      {activeTab === "bulk" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowBulkForm(!showBulkForm)}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover"
            >
              {showBulkForm ? <X size={15} /> : <Plus size={15} />}
              {showBulkForm ? "Cancel" : "New Bulk Schedule"}
            </button>
          </div>

          {showBulkForm && (
            <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
              <div className="border-b border-border-light bg-surface-hover px-5 py-3">
                <h2 className="text-sm font-semibold">New Bulk Schedule</h2>
              </div>
              <form onSubmit={handleBulkCreate} className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium">Schedule Name</label>
                  <input
                    type="text"
                    value={bulkName}
                    onChange={(e) => setBulkName(e.target.value)}
                    placeholder="e.g. Weekly content batch"
                    className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-medium">Items</label>
                    <button type="button" onClick={addBulkItem} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <Plus size={12} /> Add item
                    </button>
                  </div>
                  {bulkItems.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-border-light p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted">Item {idx + 1}</span>
                        {bulkItems.length > 1 && (
                          <button type="button" onClick={() => removeBulkItem(idx)} className="text-muted hover:text-danger">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <select
                          value={item.page}
                          onChange={(e) => updateBulkItem(idx, "page", e.target.value)}
                          className="rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="">Select page</option>
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          value={item.post_type}
                          onChange={(e) => updateBulkItem(idx, "post_type", e.target.value)}
                          className="rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="text">Text</option>
                          <option value="photo">Photo</option>
                          <option value="video">Video</option>
                          <option value="link">Link</option>
                        </select>
                        <input
                          type="datetime-local"
                          value={item.scheduled_time}
                          onChange={(e) => updateBulkItem(idx, "scheduled_time", e.target.value)}
                          className="rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      </div>
                      <textarea
                        value={item.content}
                        onChange={(e) => updateBulkItem(idx, "content", e.target.value)}
                        rows={2}
                        placeholder="Post content..."
                        className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submittingBulk}
                    className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
                  >
                    {submittingBulk ? "Creating..." : "Create Bulk Schedule"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {bulkSchedules.length === 0 && !showBulkForm ? (
            <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                <Layers size={24} className="text-primary" />
              </div>
              <p className="mt-4 font-semibold">No bulk schedules</p>
              <p className="mt-1 text-sm text-muted">Create a bulk schedule to publish multiple posts at once</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bulkSchedules.map((schedule) => (
                <div key={schedule.id} className="rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]">
                  <button
                    onClick={() => handleToggleBulkDetail(schedule.id)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{schedule.name || "Untitled Schedule"}</p>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${BULK_STATUS_STYLES[schedule.status] || "bg-surface-hover text-muted"}`}>
                          {schedule.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                        <span>{schedule.total_posts} total</span>
                        <span className="text-success">{schedule.successful_posts} succeeded</span>
                        {schedule.failed_posts > 0 && (
                          <span className="text-danger">{schedule.failed_posts} failed</span>
                        )}
                        <span>{new Date(schedule.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {expandedBulkId === schedule.id ? (
                      <ChevronUp size={16} className="shrink-0 text-muted" />
                    ) : (
                      <ChevronDown size={16} className="shrink-0 text-muted" />
                    )}
                  </button>

                  {expandedBulkId === schedule.id && (
                    <div className="border-t border-border-light px-5 pb-5 pt-3">
                      {loadingBulkDetail ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-hover" />
                          ))}
                        </div>
                      ) : bulkDetail?.items && bulkDetail.items.length > 0 ? (
                        <div className="space-y-2">
                          {bulkDetail.items.map((item: BulkScheduleItem) => (
                            <div key={item.id} className="rounded-xl border border-border-light p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="font-medium text-text-secondary">
                                      {item.page_name}
                                    </span>
                                    <span className="capitalize text-muted">{item.post_type}</span>
                                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                      item.status === "published" || item.status === "scheduled"
                                        ? "bg-success-light text-success"
                                        : item.status === "failed"
                                        ? "bg-danger-light text-danger"
                                        : "bg-info-light text-info"
                                    }`}>
                                      {item.status}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm line-clamp-2">{item.content}</p>
                                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted">
                                    <span>Scheduled: {new Date(item.scheduled_time).toLocaleString()}</span>
                                  </div>
                                  {item.error_message && (
                                    <p className="mt-1 text-xs text-danger">{item.error_message}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-3 text-center text-sm text-muted">No items in this schedule</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === "team" && (
        <div className="space-y-4">
          {!activePage ? (
            <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                <Users size={24} className="text-primary" />
              </div>
              <p className="mt-4 font-semibold">No active page</p>
              <p className="mt-1 text-sm text-muted">Select a page to manage team members</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowTeamForm(!showTeamForm)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover"
                >
                  {showTeamForm ? <X size={15} /> : <Plus size={15} />}
                  {showTeamForm ? "Cancel" : "Add Member"}
                </button>
              </div>

              {showTeamForm && (
                <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-[var(--card-shadow)]">
                  <div className="border-b border-border-light bg-surface-hover px-5 py-3">
                    <h2 className="text-sm font-semibold">Add Team Member</h2>
                  </div>
                  <form onSubmit={handleAddTeamMember} className="space-y-4 p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium">Email</label>
                        <input
                          type="email"
                          value={teamEmail}
                          onChange={(e) => setTeamEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium">Role</label>
                        <select
                          value={teamRole}
                          onChange={(e) => setTeamRole(e.target.value as (typeof ROLES)[number])}
                          className="w-full rounded-xl border border-card-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingTeam}
                        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
                      >
                        {submittingTeam ? "Adding..." : "Add Member"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {teamMembers.length === 0 && !showTeamForm ? (
                <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                    <Users size={24} className="text-primary" />
                  </div>
                  <p className="mt-4 font-semibold">No team members</p>
                  <p className="mt-1 text-sm text-muted">Add team members to collaborate on this page</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between rounded-2xl border border-card-border bg-card-bg p-4 shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)]">
                      <div>
                        <p className="font-semibold">{member.username || member.email}</p>
                        <p className="text-xs text-muted">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          disabled={updatingRoleId === member.id}
                          className={`rounded-lg border-0 px-2.5 py-1 text-xs font-semibold outline-none disabled:opacity-50 ${ROLE_STYLES[member.role] || ""}`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemoveTeamMember(member.id)}
                          disabled={removingId === member.id}
                          className="rounded-xl p-2 text-muted hover:bg-danger-light hover:text-danger disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-8">
          {loadingAnalytics ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl border border-card-border bg-card-bg" />
              ))}
            </div>
          ) : (
            <>
              {/* Cross-page analytics */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Cross-Page Analytics</h2>
                {pageAnalytics.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
                      <BarChart3 size={24} className="text-primary" />
                    </div>
                    <p className="mt-4 font-semibold">No analytics data</p>
                    <p className="mt-1 text-sm text-muted">Connect pages and publish posts to see analytics</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {pageAnalytics.map((pa) => (
                      <div key={pa.page_id} className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-[var(--card-shadow)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{pa.page_name}</p>
                            <p className="text-xs text-muted">{(pa.fan_count || 0).toLocaleString()} followers</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{pa.total_engagement.toLocaleString()}</p>
                            <p className="text-[11px] text-muted">total engagement</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="rounded-xl bg-primary-light p-3 text-center">
                            <ThumbsUp size={14} className="mx-auto text-primary" />
                            <p className="mt-1 text-sm font-semibold">{pa.total_reactions.toLocaleString()}</p>
                            <p className="text-[10px] text-muted">Reactions</p>
                          </div>
                          <div className="rounded-xl bg-info-light p-3 text-center">
                            <MessageSquare size={14} className="mx-auto text-info" />
                            <p className="mt-1 text-sm font-semibold">{pa.total_comments.toLocaleString()}</p>
                            <p className="text-[10px] text-muted">Comments</p>
                          </div>
                          <div className="rounded-xl bg-warning-light p-3 text-center">
                            <Share2 size={14} className="mx-auto text-warning" />
                            <p className="mt-1 text-sm font-semibold">{pa.total_shares.toLocaleString()}</p>
                            <p className="text-[10px] text-muted">Shares</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-4 border-t border-border-light pt-3 text-xs text-muted">
                          <span>{pa.total_posts} posts</span>
                          <span className="text-success">{pa.published} published</span>
                          <span className="text-info">{pa.scheduled} scheduled</span>
                          {pa.failed > 0 && <span className="text-danger">{pa.failed} failed</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top performing posts */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-warning" />
                  <h2 className="text-lg font-semibold">Top Performing Posts</h2>
                </div>
                {topPosts.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-card-border bg-card-bg p-10 text-center">
                    <Trophy size={28} className="mx-auto text-muted" />
                    <p className="mt-3 font-medium">No published posts yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topPosts.map((post, index) => (
                      <div key={post.id} className="flex items-start gap-4 rounded-2xl border border-card-border bg-card-bg p-4 shadow-[var(--card-shadow)]">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning-light text-sm font-bold text-warning">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-text-secondary">{post.page_name}</span>
                            <span className="capitalize text-muted">{post.post_type}</span>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed line-clamp-2">{post.content}</p>
                          {post.published_at && (
                            <p className="mt-1 text-[11px] text-muted">
                              {new Date(post.published_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold text-primary">{post.total_engagement.toLocaleString()}</p>
                          <div className="mt-1 flex items-center justify-end gap-3 text-[11px] text-muted">
                            <span className="flex items-center gap-0.5">
                              <ThumbsUp size={10} />
                              {post.engagement_metrics?.reactions || 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <MessageSquare size={10} />
                              {post.engagement_metrics?.comments || 0}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Share2 size={10} />
                              {post.engagement_metrics?.shares || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
