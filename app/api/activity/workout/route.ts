import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, workouts } from "@/lib/db/schema";
import { getLiveActor } from "@/lib/access";
import { estimateWorkoutKcal, isWorkoutKind, liveWorkoutStats, LIMITS } from "@/lib/activity";

import { readJson, cleanText } from "@/lib/sanitize";
export const dynamic = "force-dynamic";

/** Manual workout for the active profile. kcal is estimated from kind, minutes and weight unless given. */
export async function POST(req: Request) {
  const actor = await getLiveActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await readJson(req);
  const minutes = Math.round(Number(b?.minutes));
  if (!isWorkoutKind(b?.kind) || !Number.isFinite(minutes) || minutes < 1 || minutes > LIMITS.maxWorkoutMinutes) return NextResponse.json({ error: "Choose an activity and 1–1440 minutes." }, { status: 400 });
  const startedAt = b?.startedAt ? new Date(b.startedAt) : new Date();
  if (Number.isNaN(startedAt.getTime()) || startedAt.getTime() > Date.now() + 3_600_000) return NextResponse.json({ error: "Invalid time." }, { status: 400 });
  const u = await db.query.users.findFirst({ where: eq(users.id, actor.activeId), columns: { weightKg: true, heightCm: true } });
  // Steps counted by the phone's sensor: the server recomputes calories from them (the app's number is never trusted).
  const rawSteps = Number(b?.steps);
  const steps = Number.isFinite(rawSteps) && rawSteps > 0 ? Math.min(LIMITS.maxWorkoutSteps, Math.round(rawSteps)) : null;
  const kcal = steps !== null
    ? liveWorkoutStats({ kind: b.kind, steps, seconds: minutes * 60, weightKg: u?.weightKg ?? 60, heightCm: u?.heightCm }).kcal
    : Number.isFinite(Number(b?.kcal)) && Number(b.kcal) >= 0 && Number(b.kcal) <= LIMITS.maxWorkoutKcal ? Math.round(Number(b.kcal)) : estimateWorkoutKcal(b.kind, minutes, u?.weightKg ?? 60);
  const id = "wk_" + randomUUID().replace(/-/g, "");
  await db.insert(workouts).values({ id, userId: actor.activeId, startedAt, minutes, kcal, steps, kind: b.kind, title: cleanText(b.title, 80) || null, source: steps !== null ? "nura-phone" : "manual" });
  return NextResponse.json({ ok: true, id, kcal });
}

export async function DELETE(req: Request) {
  const actor = await getLiveActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await readJson(req);
  if (typeof b?.id !== "string") return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const r = await db.delete(workouts).where(and(eq(workouts.id, b.id), eq(workouts.userId, actor.activeId))).returning({ id: workouts.id });
  return r.length ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found." }, { status: 404 });
}
