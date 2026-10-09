/**
 * Day boundaries in the USER's time zone.
 * The server runs in UTC, so using `new Date().setHours(0,0,0,0)` made "today" roll over at 5:30 AM
 * for people in India (and at odd hours everywhere else). The browser reports its IANA zone in the
 * `nura_tz` cookie; everything that decides "today" or "which day is this meal on" goes through here.
 */
export const DEFAULT_TZ = "Asia/Kolkata";
export const TZ_COOKIE = "nura_tz";

export function isValidTz(tz: string | undefined | null): tz is string {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Milliseconds that local wall-clock time in `tz` is ahead of UTC at instant `at` (IST → +19 800 000). */
export function tzOffsetMs(tz: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** 00:00 of the local day that contains `at`. */
export function startOfDayInTz(tz: string, at: Date = new Date()): Date {
  const off = tzOffsetMs(tz, at);
  const local = at.getTime() + off;
  const startLocal = Math.floor(local / 86_400_000) * 86_400_000;
  return new Date(startLocal - off);
}

/** Start of the local day `n` days before the one containing `at` (DST-safe: recomputed per day). */
export function startOfDayDaysAgo(tz: string, n: number, at: Date = new Date()): Date {
  const todayStart = startOfDayInTz(tz, at);
  return startOfDayInTz(tz, new Date(todayStart.getTime() - n * 86_400_000 + 12 * 3_600_000));
}

/** "YYYY-MM-DD" of the local calendar day that contains `d`. */
export function dateKeyInTz(tz: string, d: Date | string | number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

/** "Mon", "Tue"… for the local day that contains `d`. */
export function weekdayInTz(tz: string, d: Date | string | number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(new Date(d));
}
