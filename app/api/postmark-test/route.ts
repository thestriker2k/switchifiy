import { NextResponse } from "next/server";
import postmark from "postmark";

export const runtime = "nodejs"; // IMPORTANT: Postmark needs Node runtime (not Edge)

export async function POST() {
  try {
    const token = process.env.POSTMARK_SERVER_TOKEN;
    const from = process.env.POSTMARK_FROM_EMAIL;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing POSTMARK_SERVER_TOKEN in env" },
        { status: 500 }
      );
    }

    if (!from) {
      return NextResponse.json(
        { ok: false, error: "Missing POSTMARK_FROM_EMAIL in env" },
        { status: 500 }
      );
    }

    const client = new postmark.ServerClient(token);

    const result = await client.sendEmail({
      From: from,
      To: from, // send to yourself for testing
      Subject: "Hello from Postmark (Switchifye test)",
      HtmlBody:
        "<strong>Hello</strong> — this is a test email sent from your Next.js API route.",
      TextBody:
        "Hello — this is a test email sent from your Next.js API route.",
      MessageStream: "outbound",
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
    note: "Use POST to send the test email.",
  });
}
