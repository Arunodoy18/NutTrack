import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deviceTokens } from "@/lib/db/schema";
import { authDevice } from "@/lib/activityStore";

export const dynamic = "force-dynamic";

/** The app signed out: stop treating this phone as a reminder device. */
export async function POST(req: Request) {
  const dev = await authDevice(req);
  if (!dev) return NextResponse.json({ ok: true }); // already gone
  await db.update(deviceTokens).set({ revoked: true }).where(eq(deviceTokens.id, dev.tokenId));
  return NextResponse.json({ ok: true });
}
