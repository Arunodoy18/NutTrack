import { NextRequest, NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { getSessionUserId } from "@/lib/access";

const MAX_DEVICES = 8;

export async function POST(req: NextRequest) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const endpoint = String(body?.endpoint ?? "");
  const p256dh = String(body?.keys?.p256dh ?? "");
  const auth = String(body?.keys?.auth ?? "");
  // Push endpoints are always https URLs on the browser vendor's push service.
  if (!/^https:\/\/[^\s]{10,1000}$/.test(endpoint) || p256dh.length < 20 || p256dh.length > 200 || auth.length < 8 || auth.length > 100) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const [{ n }] = await db.select({ n: count() }).from(pushSubscriptions).where(eq(pushSubscriptions.ownerId, me));
  const existing = await db.query.pushSubscriptions.findFirst({ where: eq(pushSubscriptions.endpoint, endpoint), columns: { id: true, ownerId: true } });
  if (!existing && n >= MAX_DEVICES) return NextResponse.json({ error: `Up to ${MAX_DEVICES} devices per account.` }, { status: 400 });

  // A device that signs into a different account re-points its subscription to that account.
  await db
    .insert(pushSubscriptions)
    .values({ ownerId: me, endpoint, p256dh, auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { ownerId: me, p256dh, auth } });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const me = await getSessionUserId();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let endpoint = "";
  try {
    endpoint = String((await req.json())?.endpoint ?? "");
  } catch {
    /* fall through */
  }
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.ownerId, me)));
  return NextResponse.json({ success: true });
}
