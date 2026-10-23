import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminderSettings } from "@/lib/db/schema";
import { authDevice } from "@/lib/activityStore";
import { sanitizeSettings, upcomingWakeups } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** The installed app asks when to set its wake-up alarms (see upcomingWakeups). Bearer device token. */
export async function GET(req: Request) {
  const dev = await authDevice(req);
  if (!dev) return NextResponse.json({ error: "Not paired" }, { status: 401 });
  const row = await db.query.reminderSettings.findFirst({ where: and(eq(reminderSettings.ownerId, dev.ownerId), eq(reminderSettings.enabled, true)) });
  const now = new Date();
  const times = row ? upcomingWakeups(sanitizeSettings(row.settings), row.timezone, now) : [];
  return NextResponse.json({ times, now: now.getTime() }, { headers: { "Cache-Control": "no-store" } });
}
