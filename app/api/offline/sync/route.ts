import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth/next";
import { and, eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, mealItems, users } from "@/lib/db/schema";
import {
  analyzeFridgeImageAction,
  analyzeMealImageAction,
  analyzeMealTextAction,
  lookupBarcodeAction,
  saveMealAction,
} from "@/app/actions";
import { canAccessProfile } from "@/lib/access";
import { MEAL_SESSIONS, guessMealSession, type SyncResponse } from "@/lib/offlineTypes";

// AI analysis can take a while.
export const maxDuration = 60;

const MAX_AGE_MS = 14 * 24 * 3600_000;
const json = (body: SyncResponse, status = 200) => NextResponse.json(body, { status });

/** Stable, per-profile meal id derived from the client's op id → retries can never duplicate. */
function mealIdFor(profileId: string, opId: string) {
  return "off_" + createHash("sha256").update(`${profileId}:${opId}`).digest("hex").slice(0, 32);
}

// Missing optional values count as 0; present-but-garbage values are rejected.
const num = (v: unknown, max: number) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(0, Math.round(n)), max) : NaN;
};

/** AI failures that won't improve on retry vs. ones that might. */
function classifyAiFailure(msg: string): SyncResponse & { http: number } {
  if (/not.?food|good try buddy|no foods could be detected|invalid meal image/i.test(msg)) {
    return { status: "invalid", error: "Couldn't find food in that.", http: 422 };
  }
  if (/limit|rate/i.test(msg)) return { status: "retry", error: "Scan limit reached — will retry later.", http: 429 };
  return { status: "retry", error: "AI is busy — will retry.", http: 503 };
}

const MEAL_NUM_COLS = [
  "totalCalories", "totalProtein", "totalFat", "totalCarbs", "totalFiber", "totalSodium", "totalIron",
  "totalCalcium", "totalVitaminC", "totalPotassium", "totalVitaminE", "totalVitaminB12",
] as const;
const ITEM_NUM_COLS = [
  "calories", "protein", "fat", "carbs", "fiber", "sodium", "iron", "calcium", "vitaminC", "potassium", "vitaminE", "vitaminB12",
] as const;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ status: "unauthorized", error: "Please sign in." }, 401);
  const accountId = session.user.id;

  let op: any;
  try {
    ({ op } = await req.json());
  } catch {
    return json({ status: "invalid", error: "Bad request." }, 400);
  }

  if (!op || typeof op !== "object") return json({ status: "invalid", error: "Missing operation." }, 400);
  if (typeof op.id !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(op.id)) {
    return json({ status: "invalid", error: "Bad operation id." }, 400);
  }

  // The item names the family member it is for. The signed-in account must own that profile —
  // never let another account absorb someone else's queue.
  const userId: string = String(op.userId ?? "");
  if (!userId || !(await canAccessProfile(accountId, userId))) {
    // Gone entirely (profile or account deleted) → park it as a visible failure; otherwise it's someone else's.
    const stillThere = userId
      ? await db.query.users.findFirst({ where: eq(users.id, userId), columns: { id: true } })
      : null;
    return stillThere
      ? json({ status: "wrong_user", error: "Queued by another account." }, 409)
      : json({ status: "invalid", error: "That profile no longer exists." }, 410);
  }

  const kind = String(op.kind);
  const needsTime = kind === "meal_manual" || kind === "meal_photo" || kind === "meal_text" || kind === "meal_barcode";
  const eatenAt = Number(op.eatenAt);
  const now = Date.now();
  if (needsTime) {
    if (!Number.isFinite(eatenAt) || eatenAt > now + 5 * 60_000) return json({ status: "invalid", error: "Meal time is in the future." }, 400);
    if (eatenAt < now - MAX_AGE_MS) return json({ status: "invalid", error: "Too old to log (over 14 days)." }, 400);
  }
  const timestamp = new Date(Number.isFinite(eatenAt) ? eatenAt : now);
  const id = mealIdFor(userId, op.id);

  try {
    /* ── Manual meal ── */
    if (kind === "meal_manual") {
      const m = op.meal ?? {};
      const name = typeof m.name === "string" ? m.name.trim().slice(0, 100) : "";
      if (!name) return json({ status: "invalid", error: "Meal needs a name." }, 400);
      const totals = {
        totalCalories: num(m.totalCalories, 20000),
        totalProtein: num(m.totalProtein, 1000),
        totalFat: num(m.totalFat, 1000),
        totalCarbs: num(m.totalCarbs, 1000),
        totalFiber: num(m.totalFiber, 200),
      };
      if (Object.values(totals).some(Number.isNaN)) return json({ status: "invalid", error: "Nutrition values must be numbers." }, 400);
      const sess = MEAL_SESSIONS.includes(m.mealSession) ? m.mealSession : guessMealSession(eatenAt);
      const result = await saveMealAction(
        userId,
        {
          summary: name, name, mealSession: sess, ...totals,
          items: [{ name, calories: totals.totalCalories, protein: totals.totalProtein, fat: totals.totalFat, carbs: totals.totalCarbs, fiber: totals.totalFiber, estimatedQuantity: "1 serving" }],
        },
        true,
        { id, timestamp }
      );
      if (!result.success) return json({ status: "retry", error: "Could not save yet." }, 500);
      return json({ status: (result as any).duplicate ? "duplicate" : "ok" });
    }

    /* ── Meals that need analysis/lookup first: photo / typed text / barcode ── */
    if (kind === "meal_photo" || kind === "meal_text" || kind === "meal_barcode") {
      // Already logged on a previous attempt? Skip the (paid) analysis entirely.
      const already = await db.query.meals.findFirst({ where: eq(meals.id, id), columns: { id: true } });
      if (already) return json({ status: "duplicate" });

      let analysis: any;
      let image: string | undefined;
      if (kind === "meal_photo") {
        const photo = typeof op.image === "string" ? op.image : "";
        if (!photo.startsWith("data:image/") || photo.length > 700_000) return json({ status: "invalid", error: "Photo is missing or too large." }, 400);
        image = photo;
        analysis = await analyzeMealImageAction(photo, userId);
      } else if (kind === "meal_text") {
        const text = typeof op.text === "string" ? op.text.trim().slice(0, 500) : "";
        if (!text) return json({ status: "invalid", error: "Nothing to analyse." }, 400);
        analysis = await analyzeMealTextAction(text, userId);
      } else {
        const code = typeof op.barcode === "string" ? op.barcode.trim() : "";
        if (!/^\d{8,14}$/.test(code)) return json({ status: "invalid", error: "That doesn't look like a barcode." }, 400);
        analysis = await lookupBarcodeAction(code);
        if (!analysis.success) {
          const notFound = /not found/i.test(String(analysis.error));
          return notFound
            ? json({ status: "invalid", error: "Product not found in the food database." }, 422)
            : json({ status: "retry", error: "Lookup failed — will retry." }, 503);
        }
      }

      if (!analysis.success || !analysis.analysis) {
        const f = classifyAiFailure(String(analysis.error ?? "Analysis failed"));
        return json({ status: f.status, error: f.error }, f.http);
      }
      const a = analysis.analysis;
      const result = await saveMealAction(
        userId,
        {
          ...a,
          summary: a.summary ?? a.name ?? "Meal",
          name: a.name,
          mealSession: a.mealSession ?? guessMealSession(eatenAt),
          imageUrl: image,
          items: (a.items ?? []).map((i: any) => ({ ...i, estimatedQuantity: i.estimatedQuantity ?? "100g" })),
        },
        true,
        { id, timestamp }
      );
      if (!result.success) return json({ status: "retry", error: "Could not save yet." }, 500);
      return json({ status: (result as any).duplicate ? "duplicate" : "ok" });
    }

    /* ── Delete a saved meal (idempotent: already gone counts as done) ── */
    if (kind === "meal_delete") {
      const mealId = String(op.mealId ?? "");
      if (!mealId) return json({ status: "invalid", error: "Missing meal." }, 400);
      const gone = await db.delete(meals).where(and(eq(meals.id, mealId), eq(meals.userId, userId))).returning({ id: meals.id });
      return json({ status: gone.length ? "ok" : "duplicate" });
    }

    /* ── Edit a saved meal: rename and/or change the portion ── */
    if (kind === "meal_edit") {
      const mealId = String(op.mealId ?? "");
      const meal = await db.query.meals.findFirst({ where: and(eq(meals.id, mealId), eq(meals.userId, userId)) });
      if (!meal) return json({ status: "duplicate" }); // deleted meanwhile
      const scale = op.scale === undefined ? 1 : Number(op.scale);
      if (!Number.isFinite(scale) || scale < 0.25 || scale > 4) return json({ status: "invalid", error: "Portion must be between ¼× and 4×." }, 400);
      const newName = typeof op.newName === "string" ? op.newName.trim().slice(0, 120) : "";

      // Precondition: only apply the change if the meal still looks like it did when the edit was queued.
      // If a previous attempt already applied it (response lost), calories differ → treat as done.
      if (op.expectedCalories !== undefined && Number(op.expectedCalories) !== meal.totalCalories && scale !== 1) {
        if (newName && newName !== meal.summary) await db.update(meals).set({ summary: newName }).where(eq(meals.id, meal.id));
        return json({ status: "duplicate" });
      }

      const patch: Record<string, unknown> = {};
      if (newName) patch.summary = newName;
      if (scale !== 1) for (const c of MEAL_NUM_COLS) patch[c] = Math.round(((meal as any)[c] ?? 0) * scale);
      if (Object.keys(patch).length) await db.update(meals).set(patch).where(eq(meals.id, meal.id));

      if (scale !== 1) {
        const items = await db.query.mealItems.findMany({ where: eq(mealItems.mealId, meal.id) });
        for (const it of items) {
          const ip: Record<string, unknown> = {};
          for (const c of ITEM_NUM_COLS) ip[c] = Math.round(((it as any)[c] ?? 0) * scale);
          await db.update(mealItems).set(ip).where(eq(mealItems.id, it.id));
        }
      }
      return json({ status: "ok" });
    }

    /* ── Fridge photo: generate recipes now, hand the result back to the device ── */
    if (kind === "fridge_photo") {
      const image = typeof op.image === "string" ? op.image : "";
      if (!image.startsWith("data:image/") || image.length > 700_000) return json({ status: "invalid", error: "Photo is missing or too large." }, 400);
      const res: any = await analyzeFridgeImageAction(image, userId);
      if (!res.success || !res.data) {
        const f = classifyAiFailure(String(res.error ?? "Analysis failed"));
        return json({ status: f.status, error: f.error }, f.http);
      }
      return NextResponse.json({ status: "ok", result: res.data } satisfies SyncResponse);
    }

    return json({ status: "invalid", error: "Unknown operation." }, 400);
  } catch (err) {
    console.error("[offline/sync] error:", err);
    return json({ status: "retry", error: "Server hiccup — will retry." }, 500);
  }
}
