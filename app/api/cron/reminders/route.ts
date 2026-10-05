import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isPushConfigured } from "@/lib/push";
import { runReminders } from "@/lib/notifications/reminders";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "push not configured" }, { status: 503 });
  }

  try {
    const summary = await runReminders();
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron/reminders]", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
