import { dateKeyInTz } from "@/lib/tz";

/** Calendar arithmetic on "YYYY-MM-DD" strings (no time zones involved). */
function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) - 86_400_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Consecutive days with at least one logged meal, ending today or yesterday.
 * Days are the user's local days (`tz`); in the browser it defaults to the device's own zone.
 */
export function calculateActiveStreak(timestamps: (string | Date)[], tz?: string, now: Date = new Date()): number {
  if (!timestamps || timestamps.length === 0) return 0;
  const zone = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const days = Array.from(new Set(timestamps.map((t) => dateKeyInTz(zone, t)))).sort((a, b) => b.localeCompare(a));
  const today = dateKeyInTz(zone, now);
  const yesterday = prevDay(today);

  if (days[0] !== today && days[0] !== yesterday) return 0; // streak is broken

  let streak = 0;
  let expected = days[0];
  for (const day of days) {
    if (day === expected) {
      streak++;
      expected = prevDay(expected);
    } else break;
  }
  return streak;
}
