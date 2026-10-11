import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { activitySettings, users } from "@/lib/db/schema";
import { getActor } from "@/lib/access";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const enabled = body?.creditEnabled === true;
  const pct = Math.min(100, Math.max(0, Math.round(Number(body?.creditPct ?? 50))));
  if (!Number.isFinite(pct)) return NextResponse.json({ error: "Invalid percentage." }, { status: 400 });
  const u = await db.query.users.findFirst({ where: eq(users.id, actor.activeId), columns: { age: true } });
  if (enabled && (u?.age == null || u.age < 18)) return NextResponse.json({ error: "Activity calories can only be added back for adults." }, { status: 400 });
  await db.insert(activitySettings).values({ userId: actor.activeId, creditEnabled: enabled, creditPct: pct })
    .onConflictDoUpdate({ target: activitySettings.userId, set: { creditEnabled: enabled, creditPct: pct } });
  return NextResponse.json({ ok: true, creditEnabled: enabled, creditPct: pct });
}
