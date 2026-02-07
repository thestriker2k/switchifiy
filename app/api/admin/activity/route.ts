// app/api/admin/activity/route.ts
// Derives an activity feed from existing tables (no new schema needed)

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ============================================================================
// CONFIG
// ============================================================================

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL!,
].filter(Boolean);

// ============================================================================
// AUTH CHECK
// ============================================================================

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ============================================================================
// GET /api/admin/activity
// ============================================================================

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // Fetch recent data from multiple tables in parallel
    const [
      { data: { users }, error: usersError },
      { data: recentSwitches, error: switchError },
      { data: recentRecipients, error: recipError },
      { data: subscriptions, error: subError },
      { data: completedSwitches, error: compError },
    ] = await Promise.all([
      // Recent signups (last 30 days)
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),

      // Recently created switches
      supabaseAdmin
        .from("switches")
        .select("id, user_id, name, status, created_at, last_checkin_at, interval_days")
        .order("created_at", { ascending: false })
        .limit(50),

      // Recently added recipients
      supabaseAdmin
        .from("recipients")
        .select("id, user_id, name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(50),

      // Subscriptions (for plan changes)
      supabaseAdmin
        .from("subscriptions")
        .select("user_id, plan_id, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),

      // Completed/triggered switches
      supabaseAdmin
        .from("switches")
        .select("id, user_id, name, created_at, last_checkin_at")
        .eq("status", "completed")
        .order("last_checkin_at", { ascending: false })
        .limit(20),
    ]);

    if (usersError) {
      console.error("Failed to list users:", usersError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Build email lookup from auth users
    const emailMap = new Map<string, string>();
    for (const u of users ?? []) {
      emailMap.set(u.id, u.email ?? "Unknown");
    }

    // Build the activity events
    type ActivityEvent = {
      id: string;
      type: "signup" | "switch_created" | "switch_triggered" | "contact_added" | "plan_upgraded" | "check_in";
      timestamp: string;
      user_email: string;
      user_id: string;
      description: string;
      metadata?: Record<string, string>;
    };

    const events: ActivityEvent[] = [];

    // 1. User signups
    for (const u of users ?? []) {
      events.push({
        id: `signup-${u.id}`,
        type: "signup",
        timestamp: u.created_at,
        user_email: u.email ?? "Unknown",
        user_id: u.id,
        description: "Signed up",
      });
    }

    // 2. Switches created
    for (const sw of recentSwitches ?? []) {
      events.push({
        id: `switch-${sw.id}`,
        type: "switch_created",
        timestamp: sw.created_at,
        user_email: emailMap.get(sw.user_id) ?? "Unknown",
        user_id: sw.user_id,
        description: `Created switch "${sw.name}"`,
        metadata: {
          switch_name: sw.name,
          interval: sw.interval_days === 1 ? "24h" : sw.interval_days === 365 ? "1 year" : `${sw.interval_days}d`,
        },
      });
    }

    // 3. Switches triggered (completed)
    for (const sw of completedSwitches ?? []) {
      events.push({
        id: `triggered-${sw.id}`,
        type: "switch_triggered",
        timestamp: sw.last_checkin_at ?? sw.created_at,
        user_email: emailMap.get(sw.user_id) ?? "Unknown",
        user_id: sw.user_id,
        description: `Switch "${sw.name}" triggered — notifications sent`,
        metadata: { switch_name: sw.name },
      });
    }

    // 4. Contacts added
    for (const r of recentRecipients ?? []) {
      events.push({
        id: `contact-${r.id}`,
        type: "contact_added",
        timestamp: r.created_at,
        user_email: emailMap.get(r.user_id) ?? "Unknown",
        user_id: r.user_id,
        description: `Added contact "${r.name}"`,
        metadata: { contact_name: r.name, contact_email: r.email },
      });
    }

    // 5. Plan upgrades (subscriptions that aren't free)
    for (const sub of subscriptions ?? []) {
      if (sub.plan_id && sub.plan_id !== "free") {
        events.push({
          id: `plan-${sub.user_id}-${sub.updated_at}`,
          type: "plan_upgraded",
          timestamp: sub.updated_at ?? sub.created_at,
          user_email: emailMap.get(sub.user_id) ?? "Unknown",
          user_id: sub.user_id,
          description: `Upgraded to ${sub.plan_id.charAt(0).toUpperCase() + sub.plan_id.slice(1)} plan`,
          metadata: { plan: sub.plan_id },
        });
      }
    }

    // 6. Recent check-ins (active switches with recent last_checkin_at)
    for (const sw of recentSwitches ?? []) {
      if (sw.status === "active" && sw.last_checkin_at) {
        const checkinDate = new Date(sw.last_checkin_at);
        const createdDate = new Date(sw.created_at);
        // Only include check-ins that are different from created_at (actual check-ins)
        if (Math.abs(checkinDate.getTime() - createdDate.getTime()) > 60000) {
          events.push({
            id: `checkin-${sw.id}-${sw.last_checkin_at}`,
            type: "check_in",
            timestamp: sw.last_checkin_at,
            user_email: emailMap.get(sw.user_id) ?? "Unknown",
            user_id: sw.user_id,
            description: `Checked in`,
            metadata: { switch_name: sw.name },
          });
        }
      }
    }

    // Sort by timestamp descending and take the most recent 100
    events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const recentEvents = events.slice(0, 100);

    return NextResponse.json({ events: recentEvents });
  } catch (err) {
    console.error("Admin activity API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
