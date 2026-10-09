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

export type OutboxKind =
  | "meal_manual"
  | "meal_photo"
  | "meal_text" // typed description, AI estimates once online
  | "meal_barcode" // scanned offline, looked up once online
  | "meal_delete" // remove an already-saved meal
  | "meal_edit" // rename / change portion of an already-saved meal
  | "fridge_photo"; // recipes generated once online

export interface OutboxOp {
  /** Client-generated id — also the idempotency key. */
  id: string;
  /** The profile (family member) this item is for. */
  userId: string;
  /** The signed-in account that queued it; flushing is scoped to this. Missing on old items = userId. */
  ownerId?: string;
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
  /** meal_text: what the person ate, in their own words. */
  text?: string;
  /** meal_barcode: EAN/UPC digits. */
  barcode?: string;
  /** meal_delete / meal_edit: the saved meal this applies to. */
  mealId?: string;
  /** meal_edit: portion multiplier (0.25–4) and/or new title. */
  scale?: number;
  newName?: string;
  /** meal_edit precondition: the meal's calories when the edit was queued. Makes retries idempotent. */
  expectedCalories?: number;
}

export type SyncStatus = "ok" | "duplicate" | "retry" | "invalid" | "wrong_user" | "unauthorized";
export interface SyncResponse {
  status: SyncStatus;
  error?: string;
  /** Payload for results the person needs to see (e.g. fridge recipes). */
  result?: unknown;
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
