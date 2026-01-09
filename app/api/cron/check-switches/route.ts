import { NextResponse } from "next/server";
import postmark from "postmark";
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

export async function GET(req: Request) {
  try {
    // --- Protect this endpoint (recommended) ---

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
        { status: 500 }
      );
    }

    if (!postmarkToken || !fromEmail || !replyTo) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing POSTMARK_SERVER_TOKEN / POSTMARK_FROM_EMAIL / POSTMARK_REPLY_TO_EMAIL",
        },
        { status: 500 }
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
        "id,name,user_id,status,interval_days,created_at,last_checkin_at,last_alert_sent_at"
      )
      .eq("status", "active");

    if (swErr) {
      return NextResponse.json(
        { ok: false, error: swErr.message },
        { status: 500 }
      );
    }

    const now = new Date();
    const due: DbSwitch[] = [];

    for (const s of (switches ?? []) as DbSwitch[]) {
      const base = s.last_checkin_at ?? s.created_at;
      const dueAt = addDays(base, s.interval_days);
      if (!dueAt) continue;

      // If we've already sent an alert since the base timestamp, don't resend in this cycle
      const alreadySentForThisCycle =
        s.last_alert_sent_at &&
        new Date(s.last_alert_sent_at).getTime() >= new Date(base).getTime();

      if (now.getTime() >= dueAt.getTime() && !alreadySentForThisCycle) {
        due.push(s);
      }
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    // 2) For each due switch: load message + recipients, send emails, mark last_alert_sent_at
    for (const s of due) {
      const { data: msg, error: msgErr } = await supabase
        .from("messages")
        .select("subject,body")
        .eq("switch_id", s.id)
        .maybeSingle();

      if (msgErr) continue;

      const subject = (msg?.subject || "Switch Triggered").toString();
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

      for (const to of emails) {
        try {
          await client.sendEmail({
            From: `Switchifye Alerts <${fromEmail}>`,
            To: to,
            ReplyTo: replyTo,
            Subject: subject,

            // Plain text version + footer
            TextBody: `${bodyRaw}

—
Switchifye Alerts
Questions? Email support@switchifye.com`,

            // HTML version + footer
            HtmlBody: `
              <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6;">
                <h2 style="margin: 0 0 12px;">${escapeHtml(subject)}</h2>
                <p style="margin: 0 0 16px;">${safeHtmlBody}</p>

                <hr style="margin: 24px 0;" />

                <p style="font-size: 13px; color: #666; margin: 0 0 8px;">
                  Questions? <a href="mailto:support@switchifye.com">support@switchifye.com</a>
                </p>

                <p style="font-size: 12px; color: #999; margin: 0;">
                  —<br />Switchifye Alerts<br />
                  <a href="https://switchifye.com">switchifye.com</a>
                </p>
              </div>
            `,
            MessageStream: "alerts",
          });

          emailsSent += 1;
        } catch {
          emailsFailed += 1;
        }
      }

      // mark as alerted so it doesn't re-send every 20 mins
      await supabase
        .from("switches")
        .update({ last_alert_sent_at: now.toISOString() })
        .eq("id", s.id);
    }

    return NextResponse.json({
      ok: true,
      checked: (switches ?? []).length,
      due: due.length,
      emailsSent,
      emailsFailed,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
