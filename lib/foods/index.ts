import { FOODS } from "./data";
import type { Allergen, Diet, Food, Per100, Portion } from "./types";

export { FOODS };
export type { Food, Diet, Allergen, Per100, Portion, Serving } from "./types";

const BY_ID = new Map(FOODS.map((f) => [f.id, f]));
export const getFood = (id: string): Food | undefined => BY_ID.get(id);

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Nutrition for `grams` of a food. Energy/macros to 0.1; sodium/minerals to whole numbers. */
export function portionOf(food: Food, grams: number): Portion {
  const g = Math.max(0, grams);
  const k = g / 100;
  const p = food.per100;
  return {
    grams: round1(g),
    kcal: Math.round(p.kcal * k),
    protein: round1(p.protein * k),
    fat: round1(p.fat * k),
    carbs: round1(p.carbs * k),
    fiber: round1(p.fiber * k),
    sodium: Math.round(p.sodium * k),
    iron: round1(p.iron * k),
    calcium: Math.round(p.calcium * k),
    vitaminC: round1(p.vitaminC * k),
    potassium: Math.round(p.potassium * k),
  };
}

/** Add several portions together (a meal made of several foods). */
export function sumPortions(list: Portion[]): Portion {
  const z: Portion = { grams: 0, kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, iron: 0, calcium: 0, vitaminC: 0, potassium: 0 };
  for (const p of list) for (const k of Object.keys(z) as (keyof Portion)[]) z[k] += p[k];
  for (const k of ["grams", "protein", "fat", "carbs", "fiber", "iron", "vitaminC"] as const) z[k] = round1(z[k]);
  return z;
}

/* ───────────────────────── search ───────────────────────── */

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

function editDistanceAtMost1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

interface Indexed { food: Food; name: string; names: string[]; words: string[] }
const INDEX: Indexed[] = FOODS.map((food) => {
  const names = [food.name, ...food.aliases].map(norm);
  return { food, name: norm(food.name), names, words: Array.from(new Set(names.flatMap((n) => n.split(" ")))) };
});

/** Score one food for a query; 0 = no match. Exact > prefix > whole-word > substring > typo. */
function score(ix: Indexed, q: string, qWords: string[]): number {
  let best = 0;
  for (const n of ix.names) {
    if (n === q) best = Math.max(best, 100);
    else if (n.startsWith(q)) best = Math.max(best, 80);
    else if (n.split(" ").includes(q)) best = Math.max(best, 70);
    else if (n.includes(q)) best = Math.max(best, 50);
  }
  if (best === 0 && qWords.length > 0) {
    // every query word must match some word of the food (prefix) or be within one typo
    let ok = true, total = 0;
    for (const w of qWords) {
      let m = 0;
      for (const fw of ix.words) {
        if (fw === w) m = Math.max(m, 30);
        else if (fw.startsWith(w) && w.length >= 2) m = Math.max(m, 24);
        else if (w.length >= 4 && editDistanceAtMost1(w, fw)) m = Math.max(m, 18);
      }
      if (m === 0) { ok = false; break; }
      total += m;
    }
    if (ok) best = Math.min(45, total / qWords.length);
  }
  // Prefer plain staples over elaborate dishes when equally good: shorter names rank higher.
  return best > 0 ? best - Math.min(10, ix.name.length / 8) : 0;
}

export function searchFoods(query: string, limit = 12): Food[] {
  const q = norm(query);
  if (q.length < 1) return [];
  const qWords = q.split(" ").filter(Boolean);
  return INDEX.map((ix) => ({ ix, s: score(ix, q, qWords) }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.ix.food.name.localeCompare(b.ix.food.name))
    .slice(0, limit)
    .map((r) => r.ix.food);
}

/* ───────────────────────── safety filters ───────────────────────── */

const DIET_RANK: Record<Diet, number> = { vegan: 0, vegetarian: 1, egg: 2, nonveg: 3 };

/** Does a food fit what a person eats? ("vegetarian" allows dairy but not egg; "egg" allows egg + vegetarian.) */
export function fitsDiet(foodDiet: Diet, eats: "any" | Diet): boolean {
  if (eats === "any") return true;
  return DIET_RANK[foodDiet] <= DIET_RANK[eats];
}

/** Map the free-text dietary preferences / conditions saved on a profile to filters. */
export function constraintsFromProfile(dietaryPreferences: string | null | undefined, medicalConditions: string | null | undefined) {
  const prefs = (dietaryPreferences ?? "").toLowerCase();
  const med = (medicalConditions ?? "").toLowerCase();
  let eats: "any" | Diet = "any";
  if (prefs.includes("vegan")) eats = "vegan";
  else if (prefs.includes("eggetarian")) eats = "egg";
  else if (prefs.includes("vegetarian") && !prefs.includes("non-vegetarian")) eats = "vegetarian";
  const avoid = new Set<Allergen>();
  if (prefs.includes("gluten-free") || med.includes("celiac")) avoid.add("gluten");
  if (prefs.includes("dairy-free")) avoid.add("milk");
  // "Food allergy" is unspecific: be conservative with the most common childhood allergens.
  if (med.includes("food allergy")) (["peanut", "nuts", "egg", "milk", "sesame", "shellfish", "fish", "soy"] as Allergen[]).forEach((a) => avoid.add(a));
  return { eats, avoid: Array.from(avoid), jain: prefs.includes("jain") };
}
