import { dateKeyInTz, tzOffsetMs } from "@/lib/tz";

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner";
export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

export interface ReminderSettings {
  meals: Record<MealSlot, string | null>; // "HH:MM" local time, null = off
  water: { enabled: boolean; everyMin: number; from: string; to: string };
  weighIn: { enabled: boolean; day: number; time: string }; // day: 0 = Sunday
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  meals: { breakfast: "08:30", lunch: "13:00", snack: "17:00", dinner: "20:00" },
  water: { enabled: true, everyMin: 120, from: "09:00", to: "21:00" },
  weighIn: { enabled: false, day: 0, time: "08:00" },
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const isHHMM = (v: unknown): v is string => typeof v === "string" && HHMM.test(v);
export const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Merge untrusted input over the defaults, keeping only valid values. */
export function sanitizeSettings(input: unknown): ReminderSettings {
  const src = (input && typeof input === "object" ? input : {}) as any;
  const out: ReminderSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const slot of MEAL_SLOTS) {
    const v = src.meals?.[slot];
    if (v === null) out.meals[slot] = null;
    else if (isHHMM(v)) out.meals[slot] = v;
  }
  const w = src.water ?? {};
  if (typeof w.enabled === "boolean") out.water.enabled = w.enabled;
  if ([60, 90, 120, 180, 240].includes(Number(w.everyMin))) out.water.everyMin = Number(w.everyMin);
  if (isHHMM(w.from)) out.water.from = w.from;
  if (isHHMM(w.to)) out.water.to = w.to;
  if (toMin(out.water.to) <= toMin(out.water.from)) { out.water.from = DEFAULT_SETTINGS.water.from; out.water.to = DEFAULT_SETTINGS.water.to; }
  const g = src.weighIn ?? {};
  if (typeof g.enabled === "boolean") out.weighIn.enabled = g.enabled;
  if (Number.isInteger(g.day) && g.day >= 0 && g.day <= 6) out.weighIn.day = g.day;
  if (isHHMM(g.time)) out.weighIn.time = g.time;
  return out;
}

export interface DueContext {
  now: Date;
  tz: string;
  /** minutes since the account last logged any meal (Infinity if never today) */
  minutesSinceMeal: number;
  /** minutes since the owner last logged a drink (Infinity if none today) */
  minutesSinceDrink: number;
  waterTotalMl: number;
  waterGoalMl: number;
  /** minutes since the last weigh-in (Infinity if never) */
  minutesSinceWeighIn: number;
}

export interface DueReminder {
  /** unique per slot per day: used so the same reminder is never sent twice */
  key: string;
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** How long after its scheduled minute a reminder may still fire (covers a missed/late scheduler run). */
export const GRACE_MIN = 30;

const MEAL_COPY: Record<MealSlot, { emoji: string; title: string; body: string }> = {
  breakfast: { emoji: "🍳", title: "Breakfast time", body: "Log what you ate — a photo takes 5 seconds." },
  lunch: { emoji: "🍛", title: "Lunch time", body: "Snap your plate and keep your day on track." },
  snack: { emoji: "🍎", title: "Snack check", body: "Had something? Log it now so you don't forget." },
  dinner: { emoji: "🍽️", title: "Dinner time", body: "Log tonight's meal and see how your day adds up." },
};

/** Local wall-clock minutes-of-day, weekday and date key for `now` in `tz`. */
export function localClock(now: Date, tz: string) {
  const local = new Date(now.getTime() + tzOffsetMs(tz, now));
  return {
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
    weekday: local.getUTCDay(),
    dateKey: dateKeyInTz(tz, now),
  };
}

/**
 * Which reminders should fire right now? Pure function: all state comes in through `ctx`.
 *  • meals: at the chosen time (up to GRACE_MIN late), skipped if a meal was logged in the last 90 min
 *  • water: every N minutes between from/to, skipped if they just drank or already hit the goal
 *  • weigh-in: once on the chosen weekday, skipped if they weighed in during the last 6 days
 */
export function dueReminders(settings: ReminderSettings, ctx: DueContext): DueReminder[] {
  const { minutes, weekday, dateKey } = localClock(ctx.now, ctx.tz);
  const due: DueReminder[] = [];
  const within = (start: number) => minutes >= start && minutes < start + GRACE_MIN;

  for (const slot of MEAL_SLOTS) {
    const t = settings.meals[slot];
    if (!t || !within(toMin(t))) continue;
    if (ctx.minutesSinceMeal < 90) continue; // already eating/logging
    const c = MEAL_COPY[slot];
    due.push({ key: `meal:${slot}:${dateKey}`, title: `${c.emoji} ${c.title}`, body: c.body, url: "/dashboard", tag: `meal-${slot}` });
  }

  const w = settings.water;
  if (w.enabled) {
    const from = toMin(w.from), to = toMin(w.to);
    if (minutes >= from && minutes < to) {
      const slotIdx = Math.floor((minutes - from) / w.everyMin);
      const slotStart = from + slotIdx * w.everyMin;
      const goalMet = ctx.waterTotalMl >= ctx.waterGoalMl;
      const justDrank = ctx.minutesSinceDrink < w.everyMin / 2;
      if (within(slotStart) && !goalMet && !justDrank) {
        const left = Math.max(0, ctx.waterGoalMl - ctx.waterTotalMl);
        due.push({
          key: `water:${dateKey}:${slotIdx}`,
          title: "💧 Time for water",
          body: left > 0 ? `${(left / 1000).toFixed(1)} L to go today — grab a glass.` : "Grab a glass of water.",
          url: "/dashboard",
          tag: "water",
        });
      }
    }
  }

  const g = settings.weighIn;
  if (g.enabled && weekday === g.day && within(toMin(g.time)) && ctx.minutesSinceWeighIn > 6 * 24 * 60) {
    due.push({ key: `weigh:${dateKey}`, title: "⚖️ Weekly weigh-in", body: "A quick weigh-in keeps your targets accurate.", url: "/profile", tag: "weigh-in" });
  }
  return due;
}
