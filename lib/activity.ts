import { createHash, randomBytes } from "crypto";

/* ─────────── workout kinds & calorie estimates (Compendium of Physical Activities METs) ─────────── */

export const WORKOUT_KINDS = [
  { kind: "walking", label: "Walking", met: 3.5 },
  { kind: "running", label: "Running / jogging", met: 9.0 },
  { kind: "cycling", label: "Cycling", met: 7.0 },
  { kind: "swimming", label: "Swimming", met: 6.0 },
  { kind: "yoga", label: "Yoga / stretching", met: 2.5 },
  { kind: "strength", label: "Strength training", met: 5.0 },
  { kind: "hiit", label: "HIIT / circuit", met: 8.0 },
  { kind: "sports", label: "Sports (badminton, cricket…)", met: 6.0 },
  { kind: "dance", label: "Dance / Zumba", met: 5.5 },
  { kind: "play", label: "Active play", met: 4.5 },
  { kind: "other", label: "Other", met: 4.0 },
] as const;
export type WorkoutKind = (typeof WORKOUT_KINDS)[number]["kind"];
export const isWorkoutKind = (k: unknown): k is WorkoutKind => WORKOUT_KINDS.some((w) => w.kind === k);

/** kcal ≈ MET × weight(kg) × hours, minus the resting energy that would be burned anyway (1 MET). */
export function estimateWorkoutKcal(kind: WorkoutKind, minutes: number, weightKg: number): number {
  const met = WORKOUT_KINDS.find((w) => w.kind === kind)?.met ?? 4;
  const kcal = (met - 1) * weightKg * (minutes / 60);
  return Math.max(0, Math.round(kcal));
}

/* ─────────── how active calories count toward the day ─────────── */

export const MAX_CREDIT_KCAL = 500;

/**
 * Extra calories someone may eat on an active day. OFF by default; never for under-18s (children
 * eat for growth, not "to earn" food); only a share of what a wearable reports, because wearables
 * routinely over-estimate; capped so one marathon doesn't unlock a feast.
 */
export function creditKcal(opts: { activeKcal: number; enabled: boolean; pct: number; age: number | null }): number {
  if (!opts.enabled || (opts.age !== null && opts.age < 18)) return 0;
  const pct = Math.min(100, Math.max(0, opts.pct));
  return Math.min(MAX_CREDIT_KCAL, Math.round(Math.max(0, opts.activeKcal) * (pct / 100)));
}

/* ─────────── validation of data sent by a device or the app ─────────── */

export interface ImportDay { day: string; steps: number; activeKcal: number }
export interface ImportWorkout { externalId: string; startedAt: string; minutes: number; kcal: number; kind: WorkoutKind; title: string | null }
export interface ImportWeight { at: string; kg: number }
export interface CleanImport { source: string; days: ImportDay[]; workouts: ImportWorkout[]; weights: ImportWeight[]; warnings: string[] }

export const LIMITS = { days: 400, workouts: 400, weights: 400, maxStepsPerDay: 100_000, maxKcalPerDay: 12_000, maxWorkoutMinutes: 1_440, maxWorkoutKcal: 10_000 };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_RE = /^[a-z0-9][a-z0-9_.-]{1,31}$/;

function validDay(day: string, now: number): boolean {
  if (!DAY_RE.test(day)) return false;
  const t = Date.parse(day + "T00:00:00Z");
  if (Number.isNaN(t)) return false;
  if (new Date(t).toISOString().slice(0, 10) !== day) return false; // 2026-02-31 etc.
  return t <= now + 2 * 86_400_000 && t >= now - 800 * 86_400_000; // not future (+tz slack), not > ~2 years old
}

/** Sanitise a batch. Bad rows are dropped (and counted), never trusted, and never crash the whole import. */
export function cleanImport(raw: any, now = Date.now()): { ok: true; value: CleanImport } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid request." };
  const source = typeof raw.source === "string" ? raw.source.trim().toLowerCase() : "";
  if (!SOURCE_RE.test(source)) return { ok: false, error: "Missing or invalid source." };
  const rawDays = Array.isArray(raw.days) ? raw.days : [];
  const rawWorkouts = Array.isArray(raw.workouts) ? raw.workouts : [];
  const rawWeights = Array.isArray(raw.weights) ? raw.weights : [];
  if (rawDays.length > LIMITS.days || rawWorkouts.length > LIMITS.workouts || rawWeights.length > LIMITS.weights) {
    return { ok: false, error: "Too much data in one request. Send it in smaller batches." };
  }
  const warnings: string[] = [];
  let dropped = 0;

  const byDay = new Map<string, ImportDay>();
  for (const d of rawDays) {
    const steps = Math.round(Number(d?.steps ?? 0)), kcal = Math.round(Number(d?.activeKcal ?? 0));
    if (typeof d?.day !== "string" || !validDay(d.day, now) || !Number.isFinite(steps) || !Number.isFinite(kcal) || steps < 0 || kcal < 0 || steps > LIMITS.maxStepsPerDay || kcal > LIMITS.maxKcalPerDay) { dropped++; continue; }
    byDay.set(d.day, { day: d.day, steps, activeKcal: kcal }); // last one wins for a repeated day
  }

  const byId = new Map<string, ImportWorkout>();
  for (const w of rawWorkouts) {
    const minutes = Math.round(Number(w?.minutes)), kcal = Math.round(Number(w?.kcal ?? 0));
    const started = typeof w?.startedAt === "string" ? Date.parse(w.startedAt) : NaN;
    const ext = typeof w?.externalId === "string" ? w.externalId.trim().slice(0, 100) : "";
    if (!ext || Number.isNaN(started) || started > now + 3_600_000 || started < now - 800 * 86_400_000 || !Number.isFinite(minutes) || minutes < 1 || minutes > LIMITS.maxWorkoutMinutes || !Number.isFinite(kcal) || kcal < 0 || kcal > LIMITS.maxWorkoutKcal) { dropped++; continue; }
    byId.set(ext, { externalId: ext, startedAt: new Date(started).toISOString(), minutes, kcal, kind: isWorkoutKind(w?.kind) ? w.kind : "other", title: typeof w?.title === "string" ? w.title.trim().slice(0, 80) || null : null });
  }

  const byAt = new Map<string, ImportWeight>();
  for (const w of rawWeights) {
    const kg = Math.round(Number(w?.kg) * 10) / 10, at = typeof w?.at === "string" ? Date.parse(w.at) : NaN;
    if (Number.isNaN(at) || at > now + 3_600_000 || at < now - 800 * 86_400_000 || !Number.isFinite(kg) || kg < 8 || kg > 400) { dropped++; continue; }
    byAt.set(new Date(at).toISOString(), { at: new Date(at).toISOString(), kg });
  }

  if (dropped > 0) warnings.push(`${dropped} item${dropped === 1 ? " was" : "s were"} skipped because the values looked invalid.`);
  return { ok: true, value: { source, days: Array.from(byDay.values()), workouts: Array.from(byId.values()), weights: Array.from(byAt.values()), warnings } };
}

/** Deterministic ids so re-sending the same data never duplicates it. */
export const workoutId = (profileId: string, source: string, externalId: string) =>
  "wk_" + createHash("sha256").update(`${profileId}|${source}|${externalId}`).digest("hex").slice(0, 32);
export const weightId = (profileId: string, source: string, atIso: string) =>
  "wt_" + createHash("sha256").update(`${profileId}|${source}|${atIso}`).digest("hex").slice(0, 32);

/**
 * If two apps report the same day (phone AND watch), counting both would double the steps.
 * Show the largest figure for the day instead of adding them.
 */
export function pickDay<T extends { day: string; steps: number; activeKcal: number }>(rows: T[]): Map<string, T> {
  const best = new Map<string, T>();
  for (const r of rows) {
    const cur = best.get(r.day);
    if (!cur || r.steps + r.activeKcal > cur.steps + cur.activeKcal) best.set(r.day, r);
  }
  return best;
}

/* ─────────── device tokens & pairing ─────────── */

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L: easy to read aloud and type

/** 8-character pairing code (≈ 40 bits), shown once, valid for 10 minutes, single use. */
export function newPairingCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}
export const normalizeCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/0/g, "O").replace(/1/g, "I").slice(0, 16);
/** Long random bearer secret for a paired device. Only its hash is ever stored. */
export const newDeviceToken = () => "nds_" + randomBytes(32).toString("base64url");
