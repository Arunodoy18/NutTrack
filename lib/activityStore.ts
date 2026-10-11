import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityDays, activitySettings, deviceTokens, users, weightLogs, workouts } from "@/lib/db/schema";
import { applyWeightToProfile } from "@/lib/profileService";
import { sha256, workoutId, weightId, type CleanImport } from "@/lib/activity";

export interface DeviceAuth { ownerId: string; profileId: string; tokenId: string }

/** Resolve `Authorization: Bearer nds_…` to the paired device. Revoked/unknown tokens → null. */
export async function authDevice(req: Request): Promise<DeviceAuth | null> {
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer (nds_[A-Za-z0-9_-]{20,100})$/.exec(h);
  if (!m) return null;
  const row = await db.query.deviceTokens.findFirst({ where: eq(deviceTokens.tokenHash, sha256(m[1])) });
  if (!row || row.revoked) return null;
  // The profile must still belong to the paired account.
  const prof = await db.query.users.findFirst({ where: eq(users.id, row.profileId), columns: { id: true, parentId: true } });
  if (!prof || (prof.id !== row.ownerId && prof.parentId !== row.ownerId)) return null;
  db.update(deviceTokens).set({ lastSeenAt: new Date() }).where(eq(deviceTokens.id, row.id)).catch(() => {});
  return { ownerId: row.ownerId, profileId: row.profileId, tokenId: row.id };
}

export async function storeImport(profileId: string, c: CleanImport) {
  let days = 0, wk = 0, wt = 0;
  for (const d of c.days) {
    await db.insert(activityDays).values({ userId: profileId, day: d.day, source: c.source, steps: d.steps, activeKcal: d.activeKcal })
      .onConflictDoUpdate({ target: [activityDays.userId, activityDays.day, activityDays.source], set: { steps: d.steps, activeKcal: d.activeKcal, updatedAt: new Date() } });
    days++;
  }
  for (const w of c.workouts) {
    const r = await db.insert(workouts).values({ id: workoutId(profileId, c.source, w.externalId), userId: profileId, startedAt: new Date(w.startedAt), minutes: w.minutes, kcal: w.kcal, kind: w.kind, title: w.title, source: c.source })
      .onConflictDoNothing().returning({ id: workouts.id });
    wk += r.length;
  }
  for (const w of c.weights) {
    const r = await db.insert(weightLogs).values({ id: weightId(profileId, c.source, w.at), userId: profileId, weightKg: w.kg, timestamp: new Date(w.at) })
      .onConflictDoNothing().returning({ id: weightLogs.id });
    wt += r.length;
  }
  if (wt > 0) {
    const [latest] = await db.select().from(weightLogs).where(eq(weightLogs.userId, profileId)).orderBy(desc(weightLogs.timestamp)).limit(1);
    if (latest) await applyWeightToProfile(profileId, latest.weightKg);
  }
  return { days, newWorkouts: wk, newWeights: wt };
}

export async function getActivity(profileId: string, sinceDay: string, sinceDate: Date) {
  const rows = await db.select().from(activityDays).where(and(eq(activityDays.userId, profileId), gte(activityDays.day, sinceDay)));
  const wks = await db.select().from(workouts).where(and(eq(workouts.userId, profileId), gte(workouts.startedAt, sinceDate))).orderBy(desc(workouts.startedAt)).limit(200);
  const s = await db.query.activitySettings.findFirst({ where: eq(activitySettings.userId, profileId) });
  return { days: rows, workouts: wks, settings: { creditEnabled: s?.creditEnabled ?? false, creditPct: s?.creditPct ?? 50 } };
}

