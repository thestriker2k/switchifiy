// app/api/admin/users/[userId]/switches/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = [
  process.env.ADMIN_EMAIL!,
].filter(Boolean);

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const user = await getAuthenticatedUser(request);
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await params;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { data: switches, error: switchError } = await supabaseAdmin
      .from("switches")
      .select("id, name, status, interval_days, grace_days, last_checkin_at, created_at, timezone")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (switchError) {
      return NextResponse.json({ error: switchError.message }, { status: 500 });
    }

    // Calculate trigger date for each switch
    const enrichedSwitches = (switches ?? []).map((s) => {
      const baseIso = s.last_checkin_at ?? s.created_at;
      const totalDays = (s.interval_days ?? 0) + (s.grace_days ?? 0);
      let triggerDate: string | null = null;

      if (baseIso && s.status === "active") {
        const base = new Date(baseIso);
        base.setDate(base.getDate() + totalDays);
        triggerDate = base.toISOString();
      }

      return {
        id: s.id,
        name: s.name,
        status: s.status,
        interval_days: s.interval_days,
        last_checkin_at: s.last_checkin_at,
        trigger_date: triggerDate,
        timezone: s.timezone,
      };
    });

    return NextResponse.json({ switches: enrichedSwitches });
  } catch (err) {
    console.error("Admin switches API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
