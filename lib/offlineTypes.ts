/** Shared by the on-device outbox (client) and /api/offline/sync (server). */
export const MEAL_SESSIONS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
export type MealSession = (typeof MEAL_SESSIONS)[number];

export interface ManualMeal {
  name: string;
  mealSession: MealSession;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
}

export type OutboxKind = "meal_manual" | "meal_photo";

export interface OutboxOp {
  /** Client-generated id — also the idempotency key. */
  id: string;
  userId: string;
  kind: OutboxKind;
  createdAt: number;
  /** When the person actually ate (ms epoch). Preserved across offline delays. */
  eatenAt: number;
  attempts: number;
  lastAttemptAt?: number;
  status: "pending" | "failed";
  lastError?: string;
  meal?: ManualMeal;
  /** Compressed JPEG data URL for queued photo scans. */
  image?: string;
}

export type SyncStatus = "ok" | "duplicate" | "retry" | "invalid" | "wrong_user" | "unauthorized";
export interface SyncResponse {
  status: SyncStatus;
  error?: string;
}

/** Time-of-day default for a meal session. */
export function guessMealSession(ms: number): MealSession {
  const h = new Date(ms).getHours();
  if (h >= 4 && h < 11) return "Breakfast";
  if (h >= 11 && h < 15) return "Lunch";
  if (h >= 15 && h < 18) return "Snack";
  if (h >= 18 || h < 4) return "Dinner";
  return "Snack";
}
