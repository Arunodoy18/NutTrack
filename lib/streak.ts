/**
 * Utility to calculate consecutive day streak from meal timestamp dates.
 */
export function calculateActiveStreak(timestamps: (string | Date)[]): number {
  if (!timestamps || timestamps.length === 0) return 0;

  // Convert to unique YYYY-MM-DD date strings
  const uniqueDates = Array.from(
    new Set(
      timestamps.map((t) => {
        const d = new Date(t);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
    )
  ).sort((a, b) => b.localeCompare(a)); // Sort in descending order (latest first)

  if (uniqueDates.length === 0) return 0;

  // Get today and yesterday date strings
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(1, "0")}`.replace(/-(\d)$/, "-0$1"); // Formatting safeguard

  const formattedYesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const latestLoggedDate = uniqueDates[0];
  if (latestLoggedDate !== todayStr && latestLoggedDate !== formattedYesterdayStr) {
    return 0; // Streak is broken
  }

  let streak = 0;
  const checkDate = new Date(latestLoggedDate);

  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
    if (uniqueDates[i] === expectedStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1); // Move back a day
    } else {
      break; // Gap found, stop counting
    }
  }

  return streak;
}
