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

/**
 * Drops cached page/API responses held by the service worker so a cached screen
 * from one account is never shown to the next person on a shared device.
 */
export async function clearOfflineCaches() {
  try {
    if (typeof caches === "undefined") return;
    const keep = /^(workbox-precache|static-|google-fonts)/; // shared, non-personal assets
    const names = await caches.keys();
    await Promise.all(names.filter((n) => !keep.test(n)).map((n) => caches.delete(n)));
  } catch {
    /* ignore */
  }
}
