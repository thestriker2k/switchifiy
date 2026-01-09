import { NextResponse } from "next/server";
import postmark from "postmark";

export const runtime = "nodejs"; // REQUIRED for Postmark

export async function POST() {
  try {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    const fromEmail = process.env.POSTMARK_FROM_EMAIL; // alerts@switchifye.com
    const replyTo = process.env.POSTMARK_REPLY_TO_EMAIL; // support@switchifye.com

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing POSTMARK_SERVER_TOKEN" },
        { status: 500 }
      );
    }

    if (!fromEmail) {
      return NextResponse.json(
        { ok: false, error: "Missing POSTMARK_FROM_EMAIL" },
        { status: 500 }
      );
    }

    if (!replyTo) {
      return NextResponse.json(
        { ok: false, error: "Missing POSTMARK_REPLY_TO_EMAIL" },
        { status: 500 }
      );
    }

    const client = new postmark.ServerClient(token);

    // ---------- EMAIL CONTENT ----------
    const subject = "Switch Triggered — Action Required";

    const textBody = `
A Switchifye safety switch has been triggered.

This means the owner has not checked in within their configured interval.

If you have questions, email us at support@switchifye.com.

—
Switchifye Alerts
https://switchifye.com
`;

    const htmlBody = `
<div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6;">
  <h2>Switch Triggered</h2>

  <p>
    A <strong>Switchifye safety switch</strong> has been triggered.
  </p>

  <p>
    This means the owner has not checked in within their configured interval.
  </p>

  <hr style="margin: 24px 0;" />

  <p style="font-size: 14px; color: #555;">
    If you have questions, contact us at
    <a href="mailto:support@switchifye.com">support@switchifye.com</a>.
  </p>

  <p style="font-size: 12px; color: #999;">
    —<br />
    Switchifye Alerts<br />
    <a href="https://switchifye.com">switchifye.com</a>
  </p>
</div>
`;

    const result = await client.sendEmail({
      From: `Switchifye Alerts <${fromEmail}>`,
      To: fromEmail, // 🔒 testing: sends to yourself
      ReplyTo: replyTo,
      Subject: subject,
      TextBody: textBody.trim(),
      HtmlBody: htmlBody.trim(),
      MessageStream: "alerts",
    });

    return NextResponse.json({ ok: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "POST to this endpoint to send a test Switchifye alert email.",
  });
}
