/** Fridge recipes generated while the app was syncing in the background — kept until the person opens them. */
const key = (profileId: string) => `nura_fridge_result_${profileId}`;

export interface SavedFridgeResult {
  savedAt: number;
  result: { ingredients: string[]; recipes: unknown[] };
}

export function saveFridgeResult(profileId: string, result: unknown) {
  try {
    localStorage.setItem(key(profileId), JSON.stringify({ savedAt: Date.now(), result } satisfies { savedAt: number; result: unknown }));
    window.dispatchEvent(new Event("nura:fridge-ready"));
  } catch {
    /* storage full/unavailable */
  }
}

export function loadFridgeResult(profileId: string): SavedFridgeResult | null {
  try {
    const raw = localStorage.getItem(key(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedFridgeResult;
    // Recipes older than 3 days are stale (the fridge changed).
    if (!parsed?.result || Date.now() - parsed.savedAt > 3 * 24 * 3600_000) {
      localStorage.removeItem(key(profileId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearFridgeResult(profileId: string) {
  try {
    localStorage.removeItem(key(profileId));
  } catch {
    /* ignore */
  }
}
