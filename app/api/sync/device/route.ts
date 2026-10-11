import { NextResponse } from "next/server";
import { and, eq, isNull, not, like, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { deviceTokens, pairingCodes, users } from "@/lib/db/schema";
import { getSessionUserId } from "@/lib/access";
import { newDeviceToken, normalizeCode, sha256 } from "@/lib/activity";
import { checkAuthRateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

/** Native app (no session): exchange a pairing code for a long-lived device token. Returned once. */
export async function POST(req: Request) {
  if (!(await checkAuthRateLimit(`pair:${clientIp(req)}`))) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? normalizeCode(body.code) : "";
  if (code.length !== 8) return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  // Delete-and-return makes the code single use even under concurrent attempts.
  const [row] = await db.delete(pairingCodes).where(eq(pairingCodes.codeHash, sha256(code))).returning();
  if (!row || row.expiresAt.getTime() < Date.now()) return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  const token = newDeviceToken();
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 60) || null : null;
  const forApp = body?.purpose === "app"; // the installed app's own link (reminders): bound to the account, not a chosen profile
  await db.insert(deviceTokens).values({ ownerId: row.ownerId, profileId: forApp ? row.ownerId : row.profileId, tokenHash: sha256(token), label: forApp ? `app:${label ?? "Nura app"}`.slice(0, 64) : label });
  const p = await db.query.users.findFirst({ where: eq(users.id, row.profileId), columns: { name: true } });
  return NextResponse.json({ token, profileName: p?.name ?? null }, { headers: NO_STORE });
}

/** Signed-in: list paired devices for this account. */
export async function GET() {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select({ id: deviceTokens.id, label: deviceTokens.label, profileId: deviceTokens.profileId, createdAt: deviceTokens.createdAt, lastSeenAt: deviceTokens.lastSeenAt })
    .from(deviceTokens).where(and(eq(deviceTokens.ownerId, uid), eq(deviceTokens.revoked, false), or(isNull(deviceTokens.label), not(like(deviceTokens.label, "app:%")))));
  return NextResponse.json({ devices: rows }, { headers: NO_STORE });
}

/** Signed-in: disconnect a device. */
export async function DELETE(req: Request) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const r = await db.update(deviceTokens).set({ revoked: true }).where(and(eq(deviceTokens.id, body.id), eq(deviceTokens.ownerId, uid))).returning({ id: deviceTokens.id });
  if (!r.length) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
