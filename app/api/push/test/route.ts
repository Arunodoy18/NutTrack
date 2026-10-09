import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { getSessionUserId } from "@/lib/access";
import { pushConfig, sendPush } from "@/lib/push";
import { checkAuthRateLimit } from "@/lib/rateLimit";

/** Sends a test notification to every device on the signed-in account. */
export async function POST() {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfig().configured) return NextResponse.json({ error: "Notifications aren't set up on the server yet.", code: "not_configured" }, { status: 503 });
  if (!(await checkAuthRateLimit(`pushtest:${me}`))) return NextResponse.json({ error: "Too many tests. Try again in a few minutes." }, { status: 429 });

  const subs = await db.query.pushSubscriptions.findMany({ where: eq(pushSubscriptions.ownerId, me) });
  if (subs.length === 0) return NextResponse.json({ error: "No device is subscribed yet.", code: "no_devices" }, { status: 400 });

  let sent = 0, failed = 0;
  for (const s of subs) {
    const r = await sendPush(s, { title: "💧 Nura test", body: "Notifications are working on this phone.", url: "/dashboard", tag: "test" });
    if (r === "ok") sent++;
    else {
      failed++;
      if (r === "gone") await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
    }
  }
  return NextResponse.json({ success: sent > 0, sent, failed });
}
