import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { meals, pushSubscriptions, reminderSent, reminderSettings, users, waterLogs, weightLogs } from "@/lib/db/schema";
import { dueReminders, sanitizeSettings } from "@/lib/reminders";
import { dailyWaterGoalMl } from "@/lib/hydration";
import { sendPush } from "@/lib/push";
import { startOfDayInTz } from "@/lib/tz";

export interface RunSummary {
  owners: number;
  due: number;
  sent: number;
  skippedAlreadySent: number;
  removedDead: number;
  dryRun: boolean;
  details?: { owner: string; keys: string[] }[];
}

const minutesAgo = (d: Date | null | undefined, now: Date) => (d ? Math.max(0, (now.getTime() - d.getTime()) / 60_000) : Infinity);

/**
 * Evaluate every account with reminders on and at least one subscribed device, and send what is due.
 * Safe to run as often as you like: a reminder key is claimed in `reminder_sent` BEFORE sending, so two
 * overlapping runs can never notify twice.
 */
export async function runReminders(opts: { now?: Date; dryRun?: boolean } = {}): Promise<RunSummary> {
  const now = opts.now ?? new Date();
  const dryRun = !!opts.dryRun;
  const summary: RunSummary = { owners: 0, due: 0, sent: 0, skippedAlreadySent: 0, removedDead: 0, dryRun, details: [] };

  const rows = await db.query.reminderSettings.findMany({ where: eq(reminderSettings.enabled, true) });
  for (const row of rows) {
    const subs = await db.query.pushSubscriptions.findMany({ where: eq(pushSubscriptions.ownerId, row.ownerId) });
    if (subs.length === 0) continue;
    summary.owners++;

    const tz = row.timezone;
    const settings = sanitizeSettings(row.settings);
    const owner = await db.query.users.findFirst({ where: eq(users.id, row.ownerId) });
    if (!owner) continue;

    // Family members' meals count: if anyone just ate and logged it, don't nag.
    const family = await db.query.users.findMany({ where: or(eq(users.id, row.ownerId), eq(users.parentId, row.ownerId)), columns: { id: true } });
    const ids = family.map((f) => f.id);
    const dayStart = startOfDayInTz(tz, now);

    const [lastMeal] = await db.select({ t: meals.timestamp }).from(meals).where(inArray(meals.userId, ids)).orderBy(desc(meals.timestamp)).limit(1);
    const [lastDrink] = await db.select({ t: waterLogs.timestamp }).from(waterLogs).where(eq(waterLogs.userId, row.ownerId)).orderBy(desc(waterLogs.timestamp)).limit(1);
    const [lastWeigh] = await db.select({ t: weightLogs.timestamp }).from(weightLogs).where(eq(weightLogs.userId, row.ownerId)).orderBy(desc(weightLogs.timestamp)).limit(1);
    const [{ total }] = await db
      .select({ total: sql<number>`coalesce(sum(${waterLogs.amountMl}), 0)::int` })
      .from(waterLogs)
      .where(and(eq(waterLogs.userId, row.ownerId), gte(waterLogs.timestamp, dayStart), lte(waterLogs.timestamp, now)));

    const due = dueReminders(settings, {
      now, tz,
      minutesSinceMeal: minutesAgo(lastMeal?.t, now),
      minutesSinceDrink: minutesAgo(lastDrink?.t, now),
      waterTotalMl: total,
      waterGoalMl: dailyWaterGoalMl(owner.age ?? 30, owner.gender ?? "Male", owner.activityLevel),
      minutesSinceWeighIn: minutesAgo(lastWeigh?.t, now),
    });
    summary.due += due.length;
    if (due.length) summary.details!.push({ owner: row.ownerId.slice(0, 8), keys: due.map((d) => d.key) });
    if (dryRun) continue;

    for (const r of due) {
      // Claim first, send second.
      const claimed = await db.insert(reminderSent).values({ ownerId: row.ownerId, key: r.key }).onConflictDoNothing().returning({ k: reminderSent.key });
      if (claimed.length === 0) { summary.skippedAlreadySent++; continue; }
      let anyOk = false;
      for (const s of subs) {
        const res = await sendPush(s, { title: r.title, body: r.body, url: r.url, tag: r.tag });
        if (res === "ok") anyOk = true;
        else if (res === "gone") {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
          summary.removedDead++;
        }
      }
      if (anyOk) summary.sent++;
      else await db.delete(reminderSent).where(and(eq(reminderSent.ownerId, row.ownerId), eq(reminderSent.key, r.key))); // nothing delivered: let the next run retry
    }
  }

  // Housekeeping: dedupe keys older than 3 days are useless.
  if (!dryRun) await db.delete(reminderSent).where(lte(reminderSent.sentAt, new Date(now.getTime() - 3 * 86_400_000)));
  return summary;
}
