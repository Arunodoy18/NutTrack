import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth/next";
import { and, eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals, mealItems, users, waterLogs, weightLogs, groceryList } from "@/lib/db/schema";
import { and as andOp, desc, gte, sql } from "drizzle-orm";
import { MIN_DRINK_ML, MAX_DRINK_ML, MAX_DAILY_WATER_ML } from "@/lib/hydration";
import { applyWeightToProfile } from "@/lib/profileService";
import {
  analyzeFridgeImageAction,
  analyzeMealImageAction,
  analyzeMealTextAction,
  lookupBarcodeAction,
  saveMealAction,
} from "@/app/actions";
import { canAccessProfile } from "@/lib/access";
import { MEAL_SESSIONS, guessMealSession, type SyncResponse } from "@/lib/offlineTypes";

import { readJson } from "@/lib/sanitize";
import { insertWaterWithinCap } from "@/lib/db/atomic";
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
    ({ op } = await readJson(req));
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
  const needsTime = ["meal_manual", "meal_photo", "meal_text", "meal_barcode", "water_add", "weight_log"].includes(kind);
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

      // Itemised meal (built from the food database / a recipe): validate every line, and recompute the
      // totals from the lines so a tampered client can't make the meal's total disagree with its contents.
      let items: any[] | null = null;
      if (Array.isArray(m.items) && m.items.length > 0) {
        if (m.items.length > 30) return json({ status: "invalid", error: "Too many items in one meal." }, 400);
        items = [];
        for (const it of m.items) {
          const nm = typeof it?.name === "string" ? it.name.trim().slice(0, 100) : "";
          if (!nm) return json({ status: "invalid", error: "Every food needs a name." }, 400);
          const line = {
            name: nm,
            estimatedQuantity: typeof it.quantity === "string" ? it.quantity.slice(0, 50) : "1 serving",
            calories: num(it.calories, 5000), protein: num(it.protein, 500), fat: num(it.fat, 500), carbs: num(it.carbs, 500), fiber: num(it.fiber, 100),
            sodium: num(it.sodium, 5000), iron: num(it.iron, 100), calcium: num(it.calcium, 5000), vitaminC: num(it.vitaminC, 2000), potassium: num(it.potassium, 5000),
          };
          if (Object.values(line).some((v) => typeof v === "number" && Number.isNaN(v))) return json({ status: "invalid", error: "Nutrition values must be numbers." }, 400);
          items.push(line);
        }
        const sum = (k: string) => items!.reduce((a, i) => a + (i[k] ?? 0), 0);
        totals.totalCalories = Math.min(20000, sum("calories"));
        totals.totalProtein = Math.min(1000, sum("protein"));
        totals.totalFat = Math.min(1000, sum("fat"));
        totals.totalCarbs = Math.min(1000, sum("carbs"));
        totals.totalFiber = Math.min(200, sum("fiber"));
      }
      const result = await saveMealAction(
        userId,
        {
          summary: name, name, mealSession: sess, ...totals,
          totalSodium: items ? Math.min(10000, items.reduce((a, i) => a + i.sodium, 0)) : undefined,
          totalIron: items ? Math.min(100, items.reduce((a, i) => a + i.iron, 0)) : undefined,
          totalCalcium: items ? Math.min(5000, items.reduce((a, i) => a + i.calcium, 0)) : undefined,
          totalVitaminC: items ? Math.min(2000, items.reduce((a, i) => a + i.vitaminC, 0)) : undefined,
          totalPotassium: items ? Math.min(15000, items.reduce((a, i) => a + i.potassium, 0)) : undefined,
          items: items ?? [{ name, calories: totals.totalCalories, protein: totals.totalProtein, fat: totals.totalFat, carbs: totals.totalCarbs, fiber: totals.totalFiber, estimatedQuantity: "1 serving" }],
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

    /* ── Grocery list (belongs to the account; names already on the list are skipped, so retries are safe) ── */
    if (kind === "grocery_add") {
      const raw = Array.isArray(op.groceryItems) ? op.groceryItems : [];
      const seen = new Set<string>();
      const wanted: string[] = [];
      for (const x of raw) {
        if (typeof x !== "string") continue;
        const t = x.trim().slice(0, 120);
        if (!t || seen.has(t.toLowerCase())) continue;
        seen.add(t.toLowerCase());
        wanted.push(t);
        if (wanted.length >= 80) break;
      }
      if (wanted.length === 0) return json({ status: "invalid", error: "Nothing to add." }, 400);
      const have = new Set((await db.select({ n: groceryList.ingredientName }).from(groceryList).where(eq(groceryList.userId, accountId))).map((r) => r.n.toLowerCase()));
      const fresh = wanted.filter((w) => !have.has(w.toLowerCase()));
      if (fresh.length) await db.insert(groceryList).values(fresh.map((ingredientName) => ({ userId: accountId, ingredientName, isPurchased: false })));
      return json({ status: fresh.length ? "ok" : "duplicate" });
    }

    /* ── Water ── */
    if (kind === "water_add") {
      const ml = Math.round(Number(op.amountMl));
      if (!Number.isFinite(ml) || ml < MIN_DRINK_ML || ml > MAX_DRINK_ML) {
        return json({ status: "invalid", error: `A drink must be between ${MIN_DRINK_ML} and ${MAX_DRINK_ML} ml.` }, 400);
      }
      // Sanity cap on the day's total (typos / runaway taps). Checked and inserted in one locked transaction so several
      // taps arriving together can't all pass the check.
      const res = await insertWaterWithinCap({ id, userId, amountMl: ml, at: timestamp, windowStart: new Date(timestamp.getTime() - 24 * 3600_000), capMl: MAX_DAILY_WATER_ML });
      if (res === "over") return json({ status: "invalid", error: "That's more water than is safe to log in a day." }, 400);
      return json({ status: res === "ok" ? "ok" : "duplicate" });
    }
    if (kind === "water_delete") {
      const logId = String(op.logId ?? "");
      if (!logId) return json({ status: "invalid", error: "Missing entry." }, 400);
      const gone = await db.delete(waterLogs).where(andOp(eq(waterLogs.id, logId), eq(waterLogs.userId, userId))).returning({ id: waterLogs.id });
      return json({ status: gone.length ? "ok" : "duplicate" });
    }

    /* ── Weight ── */
    if (kind === "weight_log") {
      const kg = Math.round(Number(op.weightKg) * 10) / 10;
      if (!Number.isFinite(kg) || kg < 8 || kg > 400) return json({ status: "invalid", error: "Weight must be between 8 and 400 kg." }, 400);
      const ins = await db.insert(weightLogs).values({ id, userId, weightKg: kg, timestamp }).onConflictDoNothing().returning({ id: weightLogs.id });
      if (!ins.length) return json({ status: "duplicate" });
      // Only the newest weigh-in drives the profile (offline entries can arrive out of order).
      const [latest] = await db.select().from(weightLogs).where(eq(weightLogs.userId, userId)).orderBy(desc(weightLogs.timestamp)).limit(1);
      if (latest?.id === id) await applyWeightToProfile(userId, kg);
      return json({ status: "ok" });
    }
    if (kind === "weight_delete") {
      const logId = String(op.logId ?? "");
      if (!logId) return json({ status: "invalid", error: "Missing entry." }, 400);
      const gone = await db.delete(weightLogs).where(andOp(eq(weightLogs.id, logId), eq(weightLogs.userId, userId))).returning({ id: weightLogs.id });
      if (gone.length) {
        const [latest] = await db.select().from(weightLogs).where(eq(weightLogs.userId, userId)).orderBy(desc(weightLogs.timestamp)).limit(1);
        if (latest) await applyWeightToProfile(userId, latest.weightKg);
      }
      return json({ status: gone.length ? "ok" : "duplicate" });
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
