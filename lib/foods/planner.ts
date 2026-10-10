import { RECIPES, filterRecipes, getRecipe, scaledIngredients, type MealType, type Recipe } from "./recipes";
import type { Allergen, Diet } from "./types";
import { getFood } from "./index";

export interface PlanTargets {
  calories: number;
  protein: number;
}

export interface PlanConstraints {
  eats: "any" | Diet;
  avoid: Allergen[];
  age: number;
}

export interface PlannedMeal {
  slot: MealType;
  recipeId: string;
  /** Portion multiplier applied to the recipe's single serving. */
  scale: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
}

export interface PlanDay {
  index: number;
  meals: PlannedMeal[];
  totals: { kcal: number; protein: number; carbs: number; fat: number; fiber: number; sodium: number };
  /** Calories vs. target as a signed percentage (e.g. -4 = 4 % under). */
  kcalDeltaPct: number;
}

export interface PlanInput {
  targets: PlanTargets;
  constraints: PlanConstraints;
  /** Same seed → same plan. Change it to "shuffle". */
  seed: string;
  days?: number;
  /** Fixed choices (a person swapped a meal): key `${dayIndex}:${slot}` → recipe id. */
  pinned?: Record<string, string>;
}

export const SLOTS: { slot: MealType; share: number }[] = [
  { slot: "breakfast", share: 0.25 },
  { slot: "lunch", share: 0.33 },
  { slot: "snack", share: 0.12 },
  { slot: "dinner", share: 0.3 },
];

const ADULT_SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CHILD_SCALES = [0.5, 0.75, 1, 1.25, 1.5];

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const meal = (slot: MealType, r: Recipe, scale: number): PlannedMeal => ({
  slot,
  recipeId: r.id,
  scale,
  kcal: Math.round(r.perServing.kcal * scale),
  protein: Math.round(r.perServing.protein * scale * 10) / 10,
  carbs: Math.round(r.perServing.carbs * scale * 10) / 10,
  fat: Math.round(r.perServing.fat * scale * 10) / 10,
  fiber: Math.round(r.perServing.fiber * scale * 10) / 10,
  sodium: Math.round(r.perServing.sodium * scale),
});

const totalsOf = (meals: PlannedMeal[]) => {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 };
  for (const m of meals) { t.kcal += m.kcal; t.protein += m.protein; t.carbs += m.carbs; t.fat += m.fat; t.fiber += m.fiber; t.sodium += m.sodium; }
  t.protein = Math.round(t.protein * 10) / 10; t.carbs = Math.round(t.carbs * 10) / 10; t.fat = Math.round(t.fat * 10) / 10; t.fiber = Math.round(t.fiber * 10) / 10;
  return t;
};

/** Nearest allowed portion size for hitting `targetKcal` with this recipe. */
function bestScale(r: Recipe, targetKcal: number, scales: number[]) {
  let best = scales[0], bestErr = Infinity;
  for (const s of scales) {
    const err = Math.abs(r.perServing.kcal * s - targetKcal);
    if (err < bestErr) { bestErr = err; best = s; }
  }
  return { scale: best, err: bestErr };
}

export function generatePlan(input: PlanInput): PlanDay[] {
  const days = input.days ?? 7;
  const rand = rng(input.seed);
  const child = input.constraints.age < 18;
  const scales = child ? CHILD_SCALES : ADULT_SCALES;
  const { targets } = input;
  const pool = filterRecipes(RECIPES, { eats: input.constraints.eats, avoid: input.constraints.avoid, age: input.constraints.age });
  const recentBySlot = new Map<MealType, string[]>();
  const out: PlanDay[] = [];

  for (let d = 0; d < days; d++) {
    const chosen: Partial<Record<MealType, PlannedMeal>> = {};
    const usedToday = new Set<string>();

    // Hardest-to-fit slots first so they get the best candidates.
    for (const { slot, share } of [SLOTS[1], SLOTS[3], SLOTS[0], SLOTS[2]]) {
      const slotKcal = targets.calories * share;
      const slotProtein = targets.protein * share;
      const pinnedId = input.pinned?.[`${d}:${slot}`];
      const pinned = pinnedId ? getRecipe(pinnedId) : undefined;
      let candidates = pinned ? [pinned] : pool.filter((r) => r.meals.includes(slot));
      if (candidates.length === 0) candidates = RECIPES.filter((r) => r.meals.includes(slot) && filterRecipes([r], { eats: input.constraints.eats, avoid: input.constraints.avoid, age: input.constraints.age }).length > 0);
      if (candidates.length === 0) continue; // nothing safe exists for this slot: leave it empty rather than risk it

      const recent = recentBySlot.get(slot) ?? [];
      let bestR: Recipe | null = null, bestScore = Infinity, bestScale = 1;
      for (const r of candidates) {
        const { scale, err } = bestScale_(r, slotKcal, scales);
        const m = meal(slot, r, scale);
        let score = err / slotKcal;                                       // calorie fit
        score += Math.max(0, 1 - m.protein / Math.max(1, slotProtein)) * 0.35; // protein shortfall
        const lastSeen = recent.lastIndexOf(r.id);
        if (lastSeen >= 0) score += 0.9 / (recent.length - lastSeen);     // variety: recently used → heavy penalty
        if (usedToday.has(r.id)) score += 2;
        if (scale >= 2 || scale <= 0.5) score += 0.08;                    // prefer natural portions
        score += rand() * 0.12;                                          // seeded jitter → different plans per seed
        if (score < bestScore) { bestScore = score; bestR = r; bestScale = scale; }
      }
      if (bestR) {
        chosen[slot] = meal(slot, bestR, bestScale);
        usedToday.add(bestR.id);
        recent.push(bestR.id);
        recentBySlot.set(slot, recent.slice(-4));
      }
    }

    // Day-level correction: nudge portions (never the pinned ones) so the day lands near the target.
    const order: MealType[] = ["lunch", "dinner", "breakfast", "snack"];
    for (let pass = 0; pass < 3; pass++) {
      const cur = totalsOf(Object.values(chosen) as PlannedMeal[]);
      const diff = targets.calories - cur.kcal;
      if (Math.abs(diff) <= targets.calories * 0.04) break;
      let improved = false;
      for (const slot of order) {
        const m = chosen[slot];
        if (!m || input.pinned?.[`${d}:${slot}`]) continue;
        const r = getRecipe(m.recipeId)!;
        const wantKcal = m.kcal + diff;
        const { scale } = bestScale_(r, wantKcal, scales);
        if (scale !== m.scale) {
          const next = meal(slot, r, scale);
          const before = Math.abs(targets.calories - cur.kcal);
          const after = Math.abs(targets.calories - (cur.kcal - m.kcal + next.kcal));
          if (after < before) { chosen[slot] = next; improved = true; break; }
        }
      }
      if (!improved) break;
    }

    const meals = (["breakfast", "lunch", "snack", "dinner"] as MealType[]).map((s) => chosen[s]).filter(Boolean) as PlannedMeal[];
    const totals = totalsOf(meals);
    out.push({ index: d, meals, totals, kcalDeltaPct: Math.round(((totals.kcal - targets.calories) / targets.calories) * 100) });
  }
  return out;
}

function bestScale_(r: Recipe, targetKcal: number, scales: number[]) {
  return bestScale(r, targetKcal, scales);
}

/** One shopping list for a whole plan (or any set of meals): grams per food, grouped by category. */
export function groceryForPlan(plan: PlanDay[]) {
  const acc = new Map<string, number>();
  for (const day of plan) for (const m of day.meals) {
    const r = getRecipe(m.recipeId)!;
    for (const ing of scaledIngredients(r, m.scale)) acc.set(ing.foodId, (acc.get(ing.foodId) ?? 0) + ing.grams);
  }
  return Array.from(acc.entries())
    .map(([foodId, grams]) => {
      const f = getFood(foodId)!;
      return { foodId, name: f.name, category: f.category, grams: Math.max(5, Math.round(grams / 5) * 5) };
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}
