import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions, reminderSettings } from "@/lib/db/schema";
import { getSessionUserId } from "@/lib/access";
import { pushConfig } from "@/lib/push";
import { sanitizeSettings } from "@/lib/reminders";
import { isValidTz, DEFAULT_TZ } from "@/lib/tz";

import { readJson } from "@/lib/sanitize";
async function load(ownerId: string) {
  const row = await db.query.reminderSettings.findFirst({ where: eq(reminderSettings.ownerId, ownerId) });
  const subs = await db.query.pushSubscriptions.findMany({ where: eq(pushSubscriptions.ownerId, ownerId), columns: { id: true } });
  const cfg = pushConfig();
  return {
    enabled: row?.enabled ?? false,
    timezone: row?.timezone ?? DEFAULT_TZ,
    settings: sanitizeSettings(row?.settings),
    devices: subs.length,
    pushConfigured: cfg.configured,
    publicKey: cfg.configured ? cfg.publicKey : null,
  };
}

export async function GET() {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, ...(await load(me)) });
}

export async function PUT(req: NextRequest) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: any;
  try {
    body = await readJson(req);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const settings = sanitizeSettings(body?.settings);
  const enabled = body?.enabled === true;
  const timezone = isValidTz(body?.timezone) ? body.timezone : DEFAULT_TZ;

  await db
    .insert(reminderSettings)
    .values({ ownerId: me, enabled, timezone, settings, updatedAt: new Date() })
    .onConflictDoUpdate({ target: reminderSettings.ownerId, set: { enabled, timezone, settings, updatedAt: new Date() } });
  return NextResponse.json({ success: true, ...(await load(me)) });
}
