import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runReminders } from "@/lib/reminderRunner";
import { pushConfig } from "@/lib/push";

export const maxDuration = 60;

function authorised(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed: no secret configured → nobody can trigger it
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Called every ~10 minutes by the Netlify scheduled function. `?dry=1` shows what WOULD be sent. */
export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfig().configured) return NextResponse.json({ error: "VAPID keys are not configured", code: "not_configured" }, { status: 503 });
  const dryRun = req.nextUrl.searchParams.get("dry") === "1";
  const now = req.nextUrl.searchParams.get("now"); // only honoured for dry runs (testing)
  const at = dryRun && now && !Number.isNaN(Date.parse(now)) ? new Date(now) : undefined;
  try {
    return NextResponse.json({ success: true, ...(await runReminders({ dryRun, now: at })) });
  } catch (err) {
    console.error("[push/cron] failed:", err);
    return NextResponse.json({ error: "Run failed" }, { status: 500 });
  }
}
