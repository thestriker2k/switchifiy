// app/admin/page.tsx
"use client";

import { useEffect, useState } from "react";

// ============================================================================
// TYPES
// ============================================================================

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  plan_id: string;
  current_period_end: string | null;
  has_stripe: boolean;
  switches_total: number;
  switches_active: number;
  recipients_count: number;
};

type UserSwitch = {
  id: string;
  name: string;
  status: string;
  interval_days: number;
  last_checkin_at: string | null;
  trigger_date: string | null;
  timezone: string | null;
};

type Stats = {
  totalUsers: number;
  freeUsers: number;
  starterUsers: number;
  proUsers: number;
  totalSwitches: number;
  activeSwitches: number;
  totalRecipients: number;
  signupsToday: number;
  signupsThisWeek: number;
  signupsThisMonth: number;
};

type ActivityEvent = {
  id: string;
  type: "signup" | "switch_created" | "switch_triggered" | "contact_added" | "plan_upgraded" | "check_in";
  timestamp: string;
  user_email: string;
  user_id: string;
  description: string;
  metadata?: Record<string, string>;
};

type Tab = "users" | "activity";

// ============================================================================
// HELPERS
// ============================================================================

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusColor(status: string): string {
  if (status === "active") return "text-teal-700 bg-teal-50 border-teal-200";
  if (status === "completed") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  return "text-gray-600 bg-gray-100 border-gray-200";
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className={`text-2xl font-bold tracking-tight ${accent ?? "text-gray-900"}`}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className="p-2 bg-gray-50 rounded-xl">{icon}</div>
      </div>
    </div>
  );
}

// ============================================================================
// PLAN BADGE
// ============================================================================

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    free: "bg-gray-100 text-gray-600 border-gray-200",
    starter: "bg-blue-50 text-blue-700 border-blue-200",
    pro: "bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-teal-700 border-teal-200",
    enterprise: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        styles[plan] ?? styles.free
      }`}
    >
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

// ============================================================================
// ACTIVITY EVENT CONFIG
// ============================================================================

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  signup: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
  },
  switch_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "text-teal-600",
    bg: "bg-teal-50 border-teal-200",
  },
  switch_triggered: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
  },
  contact_added: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
  plan_upgraded: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
  },
  check_in: {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: "text-gray-500",
    bg: "bg-gray-50 border-gray-200",
  },
};

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  users: (
    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  revenue: (
    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  switches: (
    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  growth: (
    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  contacts: (
    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  refresh: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ============================================================================
// ACTIVITY FEED COMPONENT
// ============================================================================

function ActivityFeed({
  events,
  loading,
  typeFilter,
}: {
  events: ActivityEvent[];
  loading: boolean;
  typeFilter: string;
}) {
  const filteredEvents = typeFilter === "all"
    ? events
    : events.filter((e) => e.type === typeFilter);

  // Group events by date
  const grouped = new Map<string, ActivityEvent[]>();
  for (const event of filteredEvents) {
    const date = new Date(event.timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Yesterday";
    } else {
      key = date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }

    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-9 h-9 bg-gray-200 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-sm font-medium">No activity yet</p>
        <p className="text-xs mt-1">Events will appear here as users interact with Switchifye</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([dateLabel, dayEvents]) => (
        <div key={dateLabel}>
          {/* Date header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 py-2 bg-white">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {dateLabel}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">{dayEvents.length} events</span>
          </div>

          {/* Events */}
          <div className="space-y-1 mt-1">
            {dayEvents.map((event) => {
              const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.check_in;

              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-gray-50/80 transition-colors group"
                >
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${config.bg} ${config.color}`}
                  >
                    {config.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {event.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {event.user_email}
                      </p>
                      {event.metadata?.interval && (
                        <>
                          <span className="text-gray-300">&middot;</span>
                          <span className="text-xs text-gray-400">
                            {event.metadata.interval} interval
                          </span>
                        </>
                      )}
                      {event.metadata?.plan && (
                        <>
                          <span className="text-gray-300">&middot;</span>
                          <PlanBadge plan={event.metadata.plan} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-gray-400 flex-shrink-0 pt-0.5">
                    {timeAgo(event.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>("users");

  // User filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "last_active">("newest");

  // Activity
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>("all");

  // Expanded user detail
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [switchesCache, setSwitchesCache] = useState<Record<string, UserSwitch[]>>({});
  const [loadingSwitches, setLoadingSwitches] = useState<string | null>(null);

  async function getAccessToken(): Promise<string | null> {
    const { data: sessionData } = await (await import("@/lib/supabase/client")).supabase.auth.getSession();
    return sessionData?.session?.access_token ?? null;
  }

  async function toggleUserDetail(userId: string) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }

    setExpandedUserId(userId);

    if (switchesCache[userId]) return;

    setLoadingSwitches(userId);
    try {
      const accessToken = await getAccessToken();
      const res = await fetch(`/api/admin/users/${userId}/switches`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();

      if (res.ok) {
        setSwitchesCache((prev) => ({ ...prev, [userId]: data.switches }));
      }
    } catch (err) {
      console.error("Failed to load switches:", err);
    }
    setLoadingSwitches(null);
  }

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const accessToken = await getAccessToken();

      const res = await fetch("/api/admin/users", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load admin data");
        setLoading(false);
        return;
      }

      setUsers(data.users);
      setStats(data.stats);
    } catch (err) {
      setError("Failed to connect to admin API");
    }

    setLoading(false);
  }

  async function loadActivity() {
    setActivityLoading(true);

    try {
      const accessToken = await getAccessToken();

      const res = await fetch("/api/admin/activity", {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();

      if (res.ok) {
        setActivityEvents(data.events ?? []);
      }
    } catch (err) {
      console.error("Failed to load activity:", err);
    }

    setActivityLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  // Load activity when tab switches to it
  useEffect(() => {
    if (activeTab === "activity" && activityEvents.length === 0) {
      loadActivity();
    }
  }, [activeTab]);

  // Filter + sort users
  const filteredUsers = users
    .filter((u) => {
      if (planFilter !== "all" && u.plan_id !== planFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          u.email.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === "last_active") {
        const aTime = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
        const bTime = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
        return bTime - aTime;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Estimate MRR
  const estimatedMRR = stats
    ? stats.starterUsers * 5 + stats.proUsers * 9
    : 0;

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-lg w-48" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Admin Dashboard
        </h1>
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
          {Icons.error}
          <div>
            <p className="text-sm font-medium text-red-700">{error}</p>
            <p className="text-sm text-red-600 mt-1">
              Make sure ADMIN_EMAIL and SUPABASE_SERVICE_ROLE_KEY are set in your .env
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {stats?.totalUsers ?? 0} total users
          </p>
        </div>

        <button
          onClick={() => {
            loadData();
            if (activeTab === "activity") loadActivity();
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          {Icons.refresh}
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            subtitle={`${stats.signupsThisWeek} this week`}
            icon={Icons.users}
          />
          <StatCard
            title="Est. MRR"
            value={`$${estimatedMRR}`}
            subtitle={`${stats.starterUsers + stats.proUsers} paying`}
            icon={Icons.revenue}
            accent="text-emerald-600"
          />
          <StatCard
            title="Active Switches"
            value={stats.activeSwitches}
            subtitle={`${stats.totalSwitches} total`}
            icon={Icons.switches}
          />
          <StatCard
            title="Contacts"
            value={stats.totalRecipients}
            icon={Icons.contacts}
          />
          <StatCard
            title="This Month"
            value={`+${stats.signupsThisMonth}`}
            subtitle={`${stats.signupsToday} today`}
            icon={Icons.growth}
          />
        </div>
      )}

      {/* Plan Breakdown */}
      {stats && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Breakdown</h3>
          <div className="flex gap-4">
            {[
              { label: "Free", count: stats.freeUsers, color: "bg-gray-200" },
              { label: "Starter", count: stats.starterUsers, color: "bg-blue-500" },
              { label: "Pro", count: stats.proUsers, color: "bg-teal-500" },
            ].map((p) => (
              <div key={p.label} className="flex-1">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">{p.label}</span>
                  <span className="font-semibold text-gray-900">{p.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${p.color}`}
                    style={{
                      width: stats.totalUsers > 0
                        ? `${(p.count / stats.totalUsers) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* TABS: Users | Activity */}
      {/* ================================================================ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-gray-100">
          <button
            onClick={() => setActiveTab("users")}
            className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Users
            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              {users.length}
            </span>
            {activeTab === "users" && (
              <span
                className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg, #3B82F6, #3EEBBE)" }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors ${
              activeTab === "activity"
                ? "text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Activity
            {activeTab === "activity" && (
              <span
                className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg, #3B82F6, #3EEBBE)" }}
              />
            )}
          </button>
        </div>

        {/* ============================================================ */}
        {/* USERS TAB */}
        {/* ============================================================ */}
        {activeTab === "users" && (
          <>
            {/* Filters */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {Icons.search}
                  </div>
                  <input
                    type="text"
                    placeholder="Search by email or user ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
                  />
                </div>

                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="last_active">Last Active</option>
                </select>
              </div>

              <p className="mt-2 text-xs text-gray-400">
                Showing {filteredUsers.length} of {users.length} users
              </p>
            </div>

            {/* Column Header + Rows use CSS Grid for guaranteed alignment */}
            <div
              className="grid border-b border-gray-100"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}
            >
              <div className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                User
              </div>
              <div className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Plan
              </div>
              <div className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Switches
              </div>
              <div className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Contacts
              </div>
              <div className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Signed Up
              </div>
              <div className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Last Active
              </div>
            </div>

            {/* User Rows */}
            <div className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-gray-500">
                  {search || planFilter !== "all"
                    ? "No users match your filters"
                    : "No users yet"}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isExpanded = expandedUserId === u.id;
                  const userSwitches = switchesCache[u.id];
                  const isLoadingSwitches = loadingSwitches === u.id;

                  return (
                    <div key={u.id}>
                      <button
                        type="button"
                        onClick={() => toggleUserDetail(u.id)}
                        className={`w-full min-w-0 text-left transition-colors ${
                          isExpanded ? "bg-gray-50" : "hover:bg-gray-50/50"
                        }`}
                      >
                        <div
                          className="grid items-center"
                          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}
                        >
                          <div className="px-6 py-4 min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-[#3EEBBE] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                                {u.email[0]?.toUpperCase() ?? "?"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {u.email}
                                </p>
                                <p className="text-xs text-gray-400 font-mono truncate">
                                  {u.id.slice(0, 8)}...
                                </p>
                              </div>
                              <svg
                                className={`w-4 h-4 text-gray-400 transition-transform ml-1 flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          <div className="px-4 py-4">
                            <PlanBadge plan={u.plan_id} />
                          </div>

                          <div className="px-4 py-4 text-center">
                            <span className="text-sm text-gray-900 font-medium">
                              {u.switches_active}
                            </span>
                            <span className="text-xs text-gray-400">
                              /{u.switches_total}
                            </span>
                          </div>

                          <div className="px-4 py-4 text-center">
                            <span className="text-sm text-gray-900 font-medium">
                              {u.recipients_count}
                            </span>
                          </div>

                          <div className="px-4 py-4">
                            <p className="text-sm text-gray-700">
                              {formatDate(u.created_at)}
                            </p>
                          </div>

                          <div className="px-4 py-4">
                            <p className="text-sm text-gray-500">
                              {timeAgo(u.last_sign_in_at)}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div className="px-6 pb-5 bg-gray-50 border-t border-gray-100">
                          <div className="pt-4">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                              Switches
                            </h4>

                            {isLoadingSwitches ? (
                              <div className="flex items-center gap-2 py-4">
                                <div className="animate-spin w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full" />
                                <span className="text-sm text-gray-500">Loading switches...</span>
                              </div>
                            ) : !userSwitches || userSwitches.length === 0 ? (
                              <p className="text-sm text-gray-400 py-2">No switches created</p>
                            ) : (
                              <div className="space-y-2">
                                {userSwitches.map((sw) => (
                                  <div
                                    key={sw.id}
                                    className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm"
                                  >
                                    <div className="flex items-center gap-3 flex-[2] min-w-0">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor(sw.status)}`}
                                      >
                                        {sw.status}
                                      </span>
                                      <span className="text-sm font-medium text-gray-900 truncate">
                                        {sw.name}
                                      </span>
                                    </div>

                                    <div className="flex-1 text-right">
                                      <p className="text-xs text-gray-400">Triggers</p>
                                      <p className="text-sm text-gray-700">
                                        {sw.trigger_date
                                          ? formatDateTime(sw.trigger_date)
                                          : "—"}
                                      </p>
                                    </div>

                                    <div className="flex-1 text-right">
                                      <p className="text-xs text-gray-400">Last check-in</p>
                                      <p className="text-sm text-gray-700">
                                        {sw.last_checkin_at
                                          ? timeAgo(sw.last_checkin_at)
                                          : "Never"}
                                      </p>
                                    </div>

                                    <div className="flex-shrink-0 text-right">
                                      <p className="text-xs text-gray-400">Interval</p>
                                      <p className="text-sm text-gray-700">
                                        {sw.interval_days === 1
                                          ? "24h"
                                          : sw.interval_days === 365
                                            ? "1 year"
                                            : `${sw.interval_days}d`}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* ACTIVITY TAB */}
        {/* ============================================================ */}
        {activeTab === "activity" && (
          <div className="p-6">
            {/* Activity filters */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {[
                { value: "all", label: "All" },
                { value: "signup", label: "Signups" },
                { value: "switch_created", label: "Switches" },
                { value: "switch_triggered", label: "Triggered" },
                { value: "contact_added", label: "Contacts" },
                { value: "plan_upgraded", label: "Upgrades" },
                { value: "check_in", label: "Check-ins" },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActivityTypeFilter(f.value)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activityTypeFilter === f.value
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                onClick={loadActivity}
                disabled={activityLoading}
                className="ml-auto px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all disabled:opacity-50"
              >
                {activityLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <ActivityFeed
              events={activityEvents}
              loading={activityLoading}
              typeFilter={activityTypeFilter}
            />
          </div>
        )}
      </div>
    </div>
  );
}
