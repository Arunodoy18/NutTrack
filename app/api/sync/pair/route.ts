import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pairingCodes } from "@/lib/db/schema";
import { getActor } from "@/lib/access";
import { newPairingCode, sha256 } from "@/lib/activity";
import { lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Signed-in app shows a one-time code for the ACTIVE profile; the native app swaps it for a device token. */
export async function POST() {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await db.delete(pairingCodes).where(lt(pairingCodes.expiresAt, new Date())).catch(() => {});
  const code = newPairingCode();
  await db.insert(pairingCodes).values({ codeHash: sha256(code), ownerId: actor.sessionUserId, profileId: actor.activeId, expiresAt: new Date(Date.now() + 10 * 60_000) });
  return NextResponse.json({ code, expiresInSeconds: 600 }, { headers: { "Cache-Control": "no-store" } });
}
