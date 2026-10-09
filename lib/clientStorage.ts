/**
 * Wipes every per-user value Nura keeps in localStorage (dashboard cache, scan
 * counters, premium flag, AI-tip cache). Call whenever a session ends so the
 * next person on a shared device never inherits someone else's data/state.
 */
const PREFIXES = ["db_", "ai_tip_", "dietbuddy_", "insight_", "protein_congrats_", "nura_"];

export function clearLocalUserData() {
  try {
    Object.keys(localStorage)
      .filter((k) => PREFIXES.some((p) => k.startsWith(p)))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage may be unavailable (private mode) */
  }
}
