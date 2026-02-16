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
} from "lucide-react";
import api from "@/lib/api";
import {
  FacebookPage,
  CalendarPost,
  BulkSchedule,
  TeamMember,
} from "@/lib/types";

type Tab = "calendar" | "bulk" | "team";

const ROLES = ["admin", "editor", "analyst", "viewer"] as const;

export default function SchedulerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [activePage, setActivePage] = useState<FacebookPage | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarPosts, setCalendarPosts] = useState<CalendarPost[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Bulk schedule state
  const [bulkSchedules, setBulkSchedules] = useState<BulkSchedule[]>([]);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkName, setBulkName] = useState("");
  const [bulkItems, setBulkItems] = useState<
    { page: string; content: string; post_type: string; scheduled_time: string }[]
  >([{ page: "", content: "", post_type: "text", scheduled_time: "" }]);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState<(typeof ROLES)[number]>("editor");
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

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

  // Fetch calendar data
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

  // Fetch bulk schedules
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

  // Fetch team members
  useEffect(() => {
    if (activeTab !== "team" || !activePage) return;
    api
      .get(`/scheduler/team/${activePage.page_id}/`)
      .then((res) => {
        const list = res.data.results || res.data;
        setTeamMembers(Array.isArray(list) ? list : []);
      })
      .catch(() => setTeamMembers([]));
  }, [activeTab, activePage]);

  const prevMonth = () =>
    setCalendarDate(
      new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
    );
  const nextMonth = () =>
    setCalendarDate(
      new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
    );

  const handleBulkCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBulk(true);
    api
      .post("/scheduler/bulk/create/", {
        name: bulkName,
        items: bulkItems.map((item) => ({
          ...item,
          page: Number(item.page),
        })),
      })
      .then(() => {
        setShowBulkForm(false);
        setBulkName("");
        setBulkItems([
          { page: "", content: "", post_type: "text", scheduled_time: "" },
        ]);
        // Refetch
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
    setBulkItems([
      ...bulkItems,
      { page: "", content: "", post_type: "text", scheduled_time: "" },
    ]);

  const removeBulkItem = (index: number) =>
    setBulkItems(bulkItems.filter((_, i) => i !== index));

  const updateBulkItem = (
    index: number,
    field: string,
    value: string
  ) =>
    setBulkItems(
      bulkItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePage) return;
    setSubmittingTeam(true);
    api
      .post(`/scheduler/team/${activePage.page_id}/add/`, {
        email: teamEmail,
        role: teamRole,
      })
      .then(() => {
        setShowTeamForm(false);
        setTeamEmail("");
        setTeamRole("editor");
        return api.get(`/scheduler/team/${activePage.page_id}/`);
      })
      .then((res) => {
        const list = res.data.results || res.data;
        setTeamMembers(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setSubmittingTeam(false));
  };

  const handleRemoveTeamMember = (id: number) => {
    if (!activePage) return;
    setRemovingId(id);
    api
      .delete(`/scheduler/team/${activePage.page_id}/${id}/remove/`)
      .then(() => {
        setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      })
      .catch(() => {})
      .finally(() => setRemovingId(null));
  };

  // Calendar grid helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = calendarDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const getPostsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarPosts.filter((p) => p.scheduled_time?.startsWith(dateStr));
  };

  const tabs: { key: Tab; label: string; icon: typeof Calendar }[] = [
    { key: "calendar", label: "Calendar", icon: Calendar },
    { key: "bulk", label: "Bulk Schedule", icon: Layers },
    { key: "team", label: "Team", icon: Users },
  ];

  const ROLE_COLORS: Record<string, string> = {
    admin:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    editor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    analyst:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-card-bg" />
        <div className="h-96 animate-pulse rounded-xl border border-card-border bg-card-bg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scheduler</h1>
        <p className="text-sm text-muted">
          Calendar, bulk scheduling, and team management
        </p>
      </div>

      {/* Page selector for team tab */}
      {activeTab === "team" && pages.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Page:</span>
          <select
            value={activePage?.id || ""}
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-card-border bg-card-bg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <button
              onClick={nextMonth}
              className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {loadingCalendar ? (
            <div className="h-96 animate-pulse rounded-xl border border-card-border bg-card-bg" />
          ) : (
            <div className="rounded-xl border border-card-border bg-card-bg overflow-hidden">
              <div className="grid grid-cols-7 border-b border-card-border">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="px-2 py-2 text-center text-xs font-medium text-muted"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>
              <div className="grid grid-cols-7">
                {/* Empty cells for days before the 1st */}
                {[...Array(firstDay)].map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[80px] border-b border-r border-card-border p-1"
                  />
                ))}
                {/* Day cells */}
                {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const dayPosts = getPostsForDay(day);
                  const today = new Date();
                  const isToday =
                    day === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear();
                  return (
                    <div
                      key={day}
                      className={`min-h-[80px] border-b border-r border-card-border p-1 ${
                        isToday ? "bg-primary-light" : ""
                      }`}
                    >
                      <span
                        className={`inline-block rounded-full px-1.5 text-xs ${
                          isToday
                            ? "bg-primary text-white"
                            : "text-muted"
                        }`}
                      >
                        {day}
                      </span>
                      {dayPosts.slice(0, 2).map((post) => (
                        <div
                          key={post.id}
                          className="mt-0.5 truncate rounded bg-blue-100 px-1 text-[10px] text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          title={post.content}
                        >
                          {post.content.slice(0, 20)}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <p className="mt-0.5 text-[10px] text-muted">
                          +{dayPosts.length - 2} more
                        </p>
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
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              {showBulkForm ? <X size={16} /> : <Plus size={16} />}
              {showBulkForm ? "Cancel" : "New Bulk Schedule"}
            </button>
          </div>

          {showBulkForm && (
            <form
              onSubmit={handleBulkCreate}
              className="rounded-xl border border-card-border bg-card-bg p-5 space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={bulkName}
                  onChange={(e) => setBulkName(e.target.value)}
                  placeholder="e.g. Weekly content batch"
                  className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Items</label>
                  <button
                    type="button"
                    onClick={addBulkItem}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus size={12} /> Add item
                  </button>
                </div>
                {bulkItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-card-border p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted">
                        Item {idx + 1}
                      </span>
                      {bulkItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBulkItem(idx)}
                          className="text-muted hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <select
                        value={item.page}
                        onChange={(e) =>
                          updateBulkItem(idx, "page", e.target.value)
                        }
                        className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
                      >
                        <option value="">Select page</option>
                        {pages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={item.post_type}
                        onChange={(e) =>
                          updateBulkItem(idx, "post_type", e.target.value)
                        }
                        className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                        <option value="link">Link</option>
                      </select>
                      <input
                        type="datetime-local"
                        value={item.scheduled_time}
                        onChange={(e) =>
                          updateBulkItem(idx, "scheduled_time", e.target.value)
                        }
                        className="rounded-lg border border-card-border bg-background px-3 py-1.5 text-sm"
                      />
                    </div>
                    <textarea
                      value={item.content}
                      onChange={(e) =>
                        updateBulkItem(idx, "content", e.target.value)
                      }
                      rows={2}
                      placeholder="Post content..."
                      className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingBulk}
                  className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  {submittingBulk ? "Creating..." : "Create Bulk Schedule"}
                </button>
              </div>
            </form>
          )}

          {bulkSchedules.length === 0 && !showBulkForm ? (
            <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
              <Layers size={40} className="mx-auto text-muted" />
              <p className="mt-3 font-medium">No bulk schedules</p>
              <p className="mt-1 text-sm text-muted">
                Create a bulk schedule to publish multiple posts at once
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bulkSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-xl border border-card-border bg-card-bg p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{schedule.name}</p>
                    <span className="text-xs text-muted">
                      {new Date(schedule.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {schedule.items?.length || 0} items
                  </p>
                  {schedule.items && schedule.items.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {schedule.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-sm dark:bg-gray-800"
                        >
                          <span className="truncate">
                            {item.content.slice(0, 50)}
                          </span>
                          <span
                            className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.status === "published"
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : item.status === "failed"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
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
            <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
              <Users size={40} className="mx-auto text-muted" />
              <p className="mt-3 font-medium">No active page</p>
              <p className="mt-1 text-sm text-muted">
                Select a page to manage team members
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowTeamForm(!showTeamForm)}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
                >
                  {showTeamForm ? <X size={16} /> : <Plus size={16} />}
                  {showTeamForm ? "Cancel" : "Add Member"}
                </button>
              </div>

              {showTeamForm && (
                <form
                  onSubmit={handleAddTeamMember}
                  className="rounded-xl border border-card-border bg-card-bg p-5 space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Email
                      </label>
                      <input
                        type="email"
                        value={teamEmail}
                        onChange={(e) => setTeamEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Role
                      </label>
                      <select
                        value={teamRole}
                        onChange={(e) =>
                          setTeamRole(e.target.value as (typeof ROLES)[number])
                        }
                        className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingTeam}
                      className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
                    >
                      {submittingTeam ? "Adding..." : "Add Member"}
                    </button>
                  </div>
                </form>
              )}

              {teamMembers.length === 0 && !showTeamForm ? (
                <div className="rounded-xl border border-dashed border-card-border bg-card-bg p-8 text-center">
                  <Users size={40} className="mx-auto text-muted" />
                  <p className="mt-3 font-medium">No team members</p>
                  <p className="mt-1 text-sm text-muted">
                    Add team members to collaborate on this page
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-xl border border-card-border bg-card-bg p-4"
                    >
                      <div>
                        <p className="font-medium">
                          {member.user_username || member.user_email}
                        </p>
                        <p className="text-xs text-muted">
                          {member.user_email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            ROLE_COLORS[member.role] || ""
                          }`}
                        >
                          {member.role}
                        </span>
                        <button
                          onClick={() => handleRemoveTeamMember(member.id)}
                          disabled={removingId === member.id}
                          className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/30"
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
    </div>
  );
}
