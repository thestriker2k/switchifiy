import { NextResponse } from "next/server";
import * as postmark from "postmark";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type DbSwitch = {
  id: string;
  name: string;
  user_id: string;
  status: string;
  interval_days: number;
  created_at: string;
  last_checkin_at: string | null;
  last_alert_sent_at: string | null;
  reminder_50_sent_at: string | null;
  reminder_90_sent_at: string | null;
};

type UserSettings = {
  user_id: string;
  reminder_enabled: boolean;
};

function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTimeRemaining(dueAt: Date, now: Date): string {
  const diffMs = dueAt.getTime() - now.getTime();
  if (diffMs <= 0) return "very soon";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) {
    return `${days} day${days === 1 ? "" : "s"} and ${hours} hour${hours === 1 ? "" : "s"}`;
  } else if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}`;
  } else if (totalHours > 0) {
    return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
  } else {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
    const fromEmail = process.env.POSTMARK_FROM_EMAIL;
    const replyTo = process.env.POSTMARK_REPLY_TO_EMAIL;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 },
      );
    }

    if (!postmarkToken || !fromEmail || !replyTo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing POSTMARK_SERVER_TOKEN / POSTMARK_FROM_EMAIL / POSTMARK_REPLY_TO_EMAIL",
        },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const client = new postmark.ServerClient(postmarkToken);

    // 1) Load active switches
    const { data: switches, error: swErr } = await supabase
      .from("switches")
      .select(
        "id,name,user_id,status,interval_days,created_at,last_checkin_at,last_alert_sent_at,reminder_50_sent_at,reminder_90_sent_at",
      )
      .eq("status", "active");

    if (swErr) {
      return NextResponse.json(
        { ok: false, error: swErr.message },
        { status: 500 },
      );
    }

    // 2) Load user settings for reminder preferences
    const userIds = [...new Set((switches ?? []).map((s: any) => s.user_id))];

    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("user_id,reminder_enabled")
      .in("user_id", userIds);

    // Build a map of user_id -> reminder_enabled (default true if no settings)
    const userSettingsMap = new Map<string, boolean>();
    for (const setting of (settingsData ?? []) as UserSettings[]) {
      userSettingsMap.set(setting.user_id, setting.reminder_enabled);
    }

    // 3) Get user emails for sending reminders
    const userEmailMap = new Map<string, string>();
    for (const userId of userIds) {
      try {
        const { data: userData } =
          await supabase.auth.admin.getUserById(userId);
        if (userData?.user?.email) {
          userEmailMap.set(userId, userData.user.email);
        }
      } catch {
        // Skip if we can't get the user
      }
    }

    const now = new Date();
    const due: DbSwitch[] = [];
    const reminders50: DbSwitch[] = [];
    const reminders90: DbSwitch[] = [];

    for (const s of (switches ?? []) as DbSwitch[]) {
      const base = s.last_checkin_at ?? s.created_at;
      const baseTime = new Date(base).getTime();
      const intervalMs = s.interval_days * 24 * 60 * 60 * 1000;
      const dueAt = addDays(base, s.interval_days);

      if (!dueAt) continue;

      const elapsed = now.getTime() - baseTime;
      const percentElapsed = elapsed / intervalMs;

      // Check if due for trigger
      const alreadySentForThisCycle =
        s.last_alert_sent_at &&
        new Date(s.last_alert_sent_at).getTime() >= baseTime;

      if (now.getTime() >= dueAt.getTime() && !alreadySentForThisCycle) {
        due.push(s);
        continue; // Don't send reminders if we're about to trigger
      }

      // Check if user has reminders enabled (default true)
      const reminderEnabled = userSettingsMap.get(s.user_id) ?? true;
      if (!reminderEnabled) continue;

      // Check for 50% reminder
      const already50 =
        s.reminder_50_sent_at &&
        new Date(s.reminder_50_sent_at).getTime() >= baseTime;

      if (percentElapsed >= 0.5 && !already50) {
        reminders50.push(s);
      }

      // Check for 90% reminder
      const already90 =
        s.reminder_90_sent_at &&
        new Date(s.reminder_90_sent_at).getTime() >= baseTime;

      if (percentElapsed >= 0.9 && !already90) {
        reminders90.push(s);
      }
    }

    let emailsSent = 0;
    let emailsFailed = 0;
    let remindersSent = 0;

    const failures: Array<{
      switchId: string;
      to: string;
      error: string;
      code?: string | number;
    }> = [];

    // 4) Send 50% reminder emails
    for (const s of reminders50) {
      const userEmail = userEmailMap.get(s.user_id);
      if (!userEmail) continue;

      const dueAt = addDays(s.last_checkin_at ?? s.created_at, s.interval_days);
      
      // For 24h switches, use countdown; for 7+ day switches, use date
      const is24hSwitch = s.interval_days === 1;
      const triggerText = dueAt
        ? is24hSwitch
          ? `in ${formatTimeRemaining(dueAt, now)}`
          : `on ${formatDate(dueAt)}`
        : "soon";

      try {
        await client.sendEmail({
          From: `Switchifye <${fromEmail}>`,
          To: userEmail,
          ReplyTo: replyTo,
          Subject: `Reminder: "${s.name}" is halfway to triggering`,
          TextBody: `Hi,

Your switch "${s.name}" is 50% of the way through its check-in interval.

It will trigger ${triggerText} if you don't check in.

Log in to Switchifye to check in now:
https://switchifye.com/dashboard

Switchifye – https://switchifye.com
Don't want these reminders? Manage your settings: https://switchifye.com/dashboard/settings`,
          HtmlBody: `
            <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6;">
              <h2 style="margin: 0 0 12px;">Halfway Reminder</h2>
              <p style="margin: 0 0 16px;">
                Your switch "<strong>${escapeHtml(s.name)}</strong>" is 50% of the way through its check-in interval.
              </p>
              <p style="margin: 0 0 16px;">
                It will trigger <strong>${triggerText}</strong> if you don't check in.
              </p>
              <p style="margin: 0 0 24px;">
                <a href="https://switchifye.com/dashboard" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Check in now</a>
              </p>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999; margin: 0;">
                <a href="https://switchifye.com" style="color: #999;">Switchifye</a><br />
                Don't want these reminders? <a href="https://switchifye.com/dashboard/settings" style="color: #999;">Manage your settings</a>
              </p>
            </div>
          `,
          MessageStream: "alerts",
        });

        remindersSent += 1;

        await supabase
          .from("switches")
          .update({ reminder_50_sent_at: now.toISOString() })
          .eq("id", s.id);
      } catch (err: any) {
        emailsFailed += 1;
        failures.push({
          switchId: s.id,
          to: userEmail,
          error: err?.message ?? "Unknown Postmark error",
          code: err?.code,
        });
      }
    }

    // 5) Send 90% reminder emails
    for (const s of reminders90) {
      const userEmail = userEmailMap.get(s.user_id);
      if (!userEmail) continue;

      const dueAt = addDays(s.last_checkin_at ?? s.created_at, s.interval_days);
      
      // 90% reminders always use countdown
      const triggerText = dueAt
        ? `in ${formatTimeRemaining(dueAt, now)}`
        : "very soon";

      try {
        await client.sendEmail({
          From: `Switchifye <${fromEmail}>`,
          To: userEmail,
          ReplyTo: replyTo,
          Subject: `Urgent: "${s.name}" triggers soon`,
          TextBody: `Hi,

Your switch "${s.name}" is about to trigger!

It will trigger ${triggerText} if you don't check in.

Log in to Switchifye to check in now:
https://switchifye.com/dashboard

Switchifye – https://switchifye.com
Don't want these reminders? Manage your settings: https://switchifye.com/dashboard/settings`,
          HtmlBody: `
            <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6;">
              <h2 style="margin: 0 0 12px; color: #dc2626;">⚠️ Urgent Reminder</h2>
              <p style="margin: 0 0 16px;">
                Your switch "<strong>${escapeHtml(s.name)}</strong>" is about to trigger!
              </p>
              <p style="margin: 0 0 16px;">
                It will trigger <strong>${triggerText}</strong> if you don't check in.
              </p>
              <p style="margin: 0 0 24px;">
                <a href="https://switchifye.com/dashboard" style="background: #dc2626; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Check in now</a>
              </p>
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999; margin: 0;">
                <a href="https://switchifye.com" style="color: #999;">Switchifye</a><br />
                Don't want these reminders? <a href="https://switchifye.com/dashboard/settings" style="color: #999;">Manage your settings</a>
              </p>
            </div>
          `,
          MessageStream: "alerts",
        });

        remindersSent += 1;

        await supabase
          .from("switches")
          .update({ reminder_90_sent_at: now.toISOString() })
          .eq("id", s.id);
      } catch (err: any) {
        emailsFailed += 1;
        failures.push({
          switchId: s.id,
          to: userEmail,
          error: err?.message ?? "Unknown Postmark error",
          code: err?.code,
        });
      }
    }

    // 6) Send trigger emails for due switches
    for (const s of due) {
      const { data: msg, error: msgErr } = await supabase
        .from("messages")
        .select("subject,body")
        .eq("switch_id", s.id)
        .maybeSingle();

      if (msgErr) continue;

      const subject = (msg?.subject || "Switch Triggered").toString().trim();
      const bodyRaw = (msg?.body || "").toString().trim();
      if (!bodyRaw) continue;

      const { data: links, error: linkErr } = await supabase
        .from("switch_recipients")
        .select("recipient_id")
        .eq("switch_id", s.id);

      if (linkErr) continue;

      const recipientIds = (links ?? [])
        .map((r: any) => r.recipient_id)
        .filter(Boolean);

      if (recipientIds.length === 0) continue;

      const { data: recips, error: recErr } = await supabase
        .from("recipients")
        .select("email,name")
        .in("id", recipientIds);

      if (recErr) continue;

      const emails = (recips ?? []).map((r: any) => r.email).filter(Boolean);
      if (emails.length === 0) continue;

      const safeHtmlBody = escapeHtml(bodyRaw).replace(/\n/g, "<br />");

      let anySuccessForThisSwitch = false;

      for (const to of emails) {
        try {
          await client.sendEmail({
            From: `Switchifye Alerts <${fromEmail}>`,
            To: to,
            ReplyTo: replyTo,
            Subject: subject,

            TextBody: `${bodyRaw}

Sent via Switchifye – https://switchifye.com`,

            HtmlBody: `
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6;">
                <h2 style="margin: 0 0 12px;">${escapeHtml(subject)}</h2>
                <p style="margin: 0 0 16px;">${safeHtmlBody}</p>

                <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />

                <p style="font-size: 12px; color: #999; margin: 0;">
                  Sent via <a href="https://switchifye.com" style="color: #999;">Switchifye</a>
                </p>
              </div>
            `,
            MessageStream: "alerts",
          });

          emailsSent += 1;
          anySuccessForThisSwitch = true;
        } catch (err: any) {
          emailsFailed += 1;

          failures.push({
            switchId: s.id,
            to,
            error: err?.message ?? "Unknown Postmark error",
            code: err?.code,
          });
        }
      }

      // ✅ Only mark sent if at least one email succeeded
      if (anySuccessForThisSwitch) {
        await supabase
          .from("switches")
          .update({
            last_alert_sent_at: now.toISOString(),
            status: "completed",
          })
          .eq("id", s.id);
      }
    }

    return NextResponse.json({
      ok: true,
      checked: (switches ?? []).length,
      due: due.length,
      reminders50: reminders50.length,
      reminders90: reminders90.length,
      emailsSent,
      remindersSent,
      emailsFailed,
      failures: failures.slice(0, 25),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
