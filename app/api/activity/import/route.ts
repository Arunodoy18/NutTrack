import { NextResponse } from "next/server";
import { canAccessProfile, getActor } from "@/lib/access";
import { cleanImport } from "@/lib/activity";
import { authDevice, storeImport } from "@/lib/activityStore";

export const dynamic = "force-dynamic";

/** Accepts steps/active-calorie days, workouts and weights from a paired device (Bearer) or the signed-in app. */
export async function POST(req: Request) {
  let profileId: string | null = null;
  if (req.headers.get("authorization")) {
    const dev = await authDevice(req);
    if (!dev) return NextResponse.json({ error: "Device not paired or revoked." }, { status: 401 });
    profileId = dev.profileId;
  } else {
    const actor = await getActor();
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    profileId = actor.activeId;
    if (!(await canAccessProfile(actor.sessionUserId, profileId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const text = await req.text();
  if (text.length > 600_000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const clean = cleanImport(raw);
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });
  const stored = await storeImport(profileId, clean.value);
  return NextResponse.json({ ok: true, ...stored, warnings: clean.value.warnings }, { headers: { "Cache-Control": "no-store" } });
}
