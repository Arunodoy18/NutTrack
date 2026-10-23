import { NextResponse } from "next/server";
import { getLiveActor, ownerOf } from "@/lib/access";
import { getUserTz } from "@/lib/tzServer";
import { peekScans } from "@/lib/scanQuota";

export const dynamic = "force-dynamic";

/** How many free AI scans are left today (for the little counter in the scanner). */
export async function GET() {
  const actor = await getLiveActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = await peekScans(await ownerOf(actor.activeId), await getUserTz());
  return NextResponse.json({ used: q.used, limit: q.limit, remaining: q.remaining }, { headers: { "Cache-Control": "no-store" } });
}
