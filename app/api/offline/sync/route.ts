import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { meals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { analyzeMealImageAction, saveMealAction } from "@/app/actions";
import { MEAL_SESSIONS, type SyncResponse } from "@/lib/offlineTypes";

// AI photo analysis can take a while.
export const maxDuration = 60;

const MAX_AGE_MS = 14 * 24 * 3600_000;

const json = (body: SyncResponse, status = 200) => NextResponse.json(body, { status });

/** Stable, per-user meal id derived from the client's op id → retries can never duplicate. */
function mealIdFor(userId: string, opId: string) {
  return "off_" + createHash("sha256").update(`${userId}:${opId}`).digest("hex").slice(0, 32);
}

// Missing optional values count as 0; present-but-garbage values are rejected.
const num = (v: unknown, max: number) => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(0, Math.round(n)), max) : NaN;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return json({ status: "unauthorized", error: "Please sign in." }, 401);
  const userId = session.user.id;

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
  // Queue belongs to whoever created it — never let another account absorb it.
  if (op.userId !== userId) return json({ status: "wrong_user", error: "Queued by another account." }, 409);

  const eatenAt = Number(op.eatenAt);
  const now = Date.now();
  if (!Number.isFinite(eatenAt) || eatenAt > now + 5 * 60_000) {
    return json({ status: "invalid", error: "Meal time is in the future." }, 400);
  }
  if (eatenAt < now - MAX_AGE_MS) {
    return json({ status: "invalid", error: "Too old to log (over 14 days)." }, 400);
  }
  const timestamp = new Date(eatenAt);
  const id = mealIdFor(userId, op.id);

  // Account may have been deleted since the op was queued.
  const exists = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId), columns: { id: true } });
  if (!exists) return json({ status: "unauthorized", error: "Account no longer exists." }, 401);

  try {
    /* ── Manual meal ── */
    if (op.kind === "meal_manual") {
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
      if (Object.values(totals).some(Number.isNaN)) {
        return json({ status: "invalid", error: "Nutrition values must be numbers." }, 400);
      }
      const session_ = MEAL_SESSIONS.includes(m.mealSession) ? m.mealSession : "Snack";
      const result = await saveMealAction(
        userId,
        {
          summary: name,
          name,
          mealSession: session_,
          ...totals,
          items: [
            {
              name,
              calories: totals.totalCalories,
              protein: totals.totalProtein,
              fat: totals.totalFat,
              carbs: totals.totalCarbs,
              fiber: totals.totalFiber,
              estimatedQuantity: "1 serving",
            },
          ],
        },
        true,
        { id, timestamp }
      );
      if (!result.success) return json({ status: "retry", error: "Could not save yet." }, 500);
      return json({ status: (result as any).duplicate ? "duplicate" : "ok" });
    }

    /* ── Queued photo: analyse now, then log at the original time ── */
    if (op.kind === "meal_photo") {
      const image = typeof op.image === "string" ? op.image : "";
      if (!image.startsWith("data:image/") || image.length > 700_000) {
        return json({ status: "invalid", error: "Photo is missing or too large." }, 400);
      }
      // Already logged on a previous attempt? Skip the (paid) AI call entirely.
      const already = await db.query.meals.findFirst({ where: eq(meals.id, id), columns: { id: true } });
      if (already) return json({ status: "duplicate" });

      const analysis = await analyzeMealImageAction(image, userId);
      if (!analysis.success || !analysis.analysis) {
        const msg = String((analysis as any).error ?? "Analysis failed");
        // Not-food / unreadable image won't improve on retry; limits and outages might.
        const permanent = /not.?food|good try buddy|No foods could be detected|invalid meal image/i.test(msg);
        const limited = /limit|rate/i.test(msg);
        return permanent
          ? json({ status: "invalid", error: "Couldn't find food in that photo." }, 422)
          : json({ status: "retry", error: limited ? "Scan limit reached — will retry later." : "AI is busy — will retry." }, limited ? 429 : 503);
      }
      const a = analysis.analysis;
      const result = await saveMealAction(
        userId,
        { ...a, name: a.name, imageUrl: image },
        true,
        { id, timestamp }
      );
      if (!result.success) return json({ status: "retry", error: "Could not save yet." }, 500);
      return json({ status: (result as any).duplicate ? "duplicate" : "ok" });
    }

    return json({ status: "invalid", error: "Unknown operation." }, 400);
  } catch (err) {
    console.error("[offline/sync] error:", err);
    return json({ status: "retry", error: "Server hiccup — will retry." }, 500);
  }
}
