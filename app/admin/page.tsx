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
// MAIN PAGE
// ============================================================================

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "last_active">("newest");

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      // Get the current session token to pass to the API
      const { data: sessionData } = await (await import("@/lib/supabase/client")).supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

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

  useEffect(() => {
    loadData();
  }, []);

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
      // newest (default)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // Estimate MRR (rough — doesn't account for yearly billing split)
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
          onClick={loadData}
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

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table header with search + filters */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
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

            {/* Plan filter */}
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

            {/* Sort */}
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Switches
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contacts
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Signed Up
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    {search || planFilter !== "all"
                      ? "No users match your filters"
                      : "No users yet"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    {/* User */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-[#3EEBBE] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {u.email[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[240px]">
                            {u.email}
                          </p>
                          <p className="text-xs text-gray-400 font-mono truncate max-w-[240px]">
                            {u.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-4">
                      <PlanBadge plan={u.plan_id} />
                    </td>

                    {/* Switches */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-900 font-medium">
                        {u.switches_active}
                      </span>
                      <span className="text-xs text-gray-400">
                        /{u.switches_total}
                      </span>
                    </td>

                    {/* Contacts */}
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-gray-900 font-medium">
                        {u.recipients_count}
                      </span>
                    </td>

                    {/* Signed Up */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-700">
                        {formatDate(u.created_at)}
                      </p>
                    </td>

                    {/* Last Active */}
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-500">
                        {timeAgo(u.last_sign_in_at)}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
