// app/api/admin/users/route.ts
// Server-side admin API - uses SUPABASE_SERVICE_ROLE_KEY to access auth.users

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ============================================================================
// CONFIG - Add your admin email(s) here
// ============================================================================

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL!, // Set this in your .env
  // Add more admin emails as needed
].filter(Boolean);

// ============================================================================
// AUTH CHECK
// ============================================================================

async function getAuthenticatedUser(request: Request) {
  // Try to get user from Authorization header (client passes access token)
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  // Use service role client to verify the token and get the user
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

// ============================================================================
// GET /api/admin/users
// ============================================================================

export async function GET(request: Request) {
  // 1. Check that the requesting user is an admin
  const user = await getAuthenticatedUser(request);

  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 2. Create a service-role client to access auth.users
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 3. Fetch all auth users
    const {
      data: { users },
      error: usersError,
    } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (usersError) {
      console.error("Failed to list users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 },
      );
    }

    // 4. Fetch all subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id, plan_id, current_period_end, stripe_subscription_id");

    if (subError) {
      console.error("Failed to fetch subscriptions:", subError);
    }

    // 5. Fetch switch counts per user
    const { data: switches, error: switchError } = await supabaseAdmin
      .from("switches")
      .select("user_id, status");

    if (switchError) {
      console.error("Failed to fetch switches:", switchError);
    }

    // 6. Fetch recipient counts per user
    const { data: recipients, error: recipError } = await supabaseAdmin
      .from("recipients")
      .select("user_id");

    if (recipError) {
      console.error("Failed to fetch recipients:", recipError);
    }

    // 7. Build lookup maps
    const subMap = new Map(
      (subscriptions ?? []).map((s) => [s.user_id, s]),
    );

    const switchCountMap = new Map<string, { active: number; total: number }>();
    for (const sw of switches ?? []) {
      const existing = switchCountMap.get(sw.user_id) ?? {
        active: 0,
        total: 0,
      };
      existing.total++;
      if (sw.status === "active") existing.active++;
      switchCountMap.set(sw.user_id, existing);
    }

    const recipientCountMap = new Map<string, number>();
    for (const r of recipients ?? []) {
      recipientCountMap.set(r.user_id, (recipientCountMap.get(r.user_id) ?? 0) + 1);
    }

    // 8. Merge into a single response
    const enrichedUsers = users.map((u) => {
      const sub = subMap.get(u.id);
      const switchInfo = switchCountMap.get(u.id) ?? { active: 0, total: 0 };
      const recipientCount = recipientCountMap.get(u.id) ?? 0;

      return {
        id: u.id,
        email: u.email ?? "—",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        provider: u.app_metadata?.provider ?? "email",
        plan_id: sub?.plan_id ?? "free",
        current_period_end: sub?.current_period_end ?? null,
        has_stripe: !!sub?.stripe_subscription_id,
        switches_total: switchInfo.total,
        switches_active: switchInfo.active,
        recipients_count: recipientCount,
      };
    });

    // Sort by most recent signup first
    enrichedUsers.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    // 9. Compute summary stats
    const stats = {
      totalUsers: enrichedUsers.length,
      freeUsers: enrichedUsers.filter((u) => u.plan_id === "free").length,
      starterUsers: enrichedUsers.filter((u) => u.plan_id === "starter").length,
      proUsers: enrichedUsers.filter((u) => u.plan_id === "pro").length,
      totalSwitches: (switches ?? []).length,
      activeSwitches: (switches ?? []).filter((s) => s.status === "active")
        .length,
      totalRecipients: (recipients ?? []).length,
      signupsToday: enrichedUsers.filter((u) => {
        const created = new Date(u.created_at);
        const now = new Date();
        return created.toDateString() === now.toDateString();
      }).length,
      signupsThisWeek: enrichedUsers.filter((u) => {
        const created = new Date(u.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }).length,
      signupsThisMonth: enrichedUsers.filter((u) => {
        const created = new Date(u.created_at);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return created >= monthAgo;
      }).length,
    };

    return NextResponse.json({ users: enrichedUsers, stats });
  } catch (err) {
    console.error("Admin API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
