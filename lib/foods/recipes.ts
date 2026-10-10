import { RECIPE_SEEDS } from "./recipes-data";
import { fitsDiet, getFood, portionOf, sumPortions } from "./index";
import type { Allergen, Diet, Portion } from "./types";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface RecipeSeed {
  id: string;
  name: string;
  meals: MealType[];
  cuisine: string;
  minutes: number;
  servings: number;
  spice: "mild" | "medium" | "hot";
  kidFriendly: boolean;
  ingredients: { food: string; grams: number }[];
  steps: string[];
}

export interface Recipe extends RecipeSeed {
  /** Strictest diet needed to eat it (derived from the ingredients). */
  diet: Diet;
  allergens: Allergen[];
  /** Nutrition for ONE serving. */
  perServing: Portion;
  /** Youngest age it's suitable for (whole nuts/seeds are a choking risk under 5; very spicy under 5). */
  minAge: number;
}

const DIET_RANK: Record<Diet, number> = { vegan: 0, vegetarian: 1, egg: 2, nonveg: 3 };
const CHOKING_RISK = new Set(["almonds", "cashews", "walnuts", "pistachios", "peanuts_roasted", "pumpkin_seeds", "popcorn"]);

function build(seed: RecipeSeed): Recipe {
  let diet: Diet = "vegan";
  const allergens = new Set<Allergen>();
  let minAge = 2;
  const parts: Portion[] = [];
  for (const ing of seed.ingredients) {
    const food = getFood(ing.food);
    if (!food) throw new Error(`Recipe ${seed.id}: unknown food "${ing.food}"`);
    if (DIET_RANK[food.diet] > DIET_RANK[diet]) diet = food.diet;
    food.allergens.forEach((a) => allergens.add(a));
    if (CHOKING_RISK.has(food.id)) minAge = Math.max(minAge, 5);
    parts.push(portionOf(food, ing.grams));
  }
  if (seed.spice === "hot") minAge = Math.max(minAge, 8);
  else if (seed.spice === "medium") minAge = Math.max(minAge, 3);
  const total = sumPortions(parts);
  const n = Math.max(1, seed.servings);
  const per: Portion = { ...total };
  for (const k of Object.keys(per) as (keyof Portion)[]) per[k] = Math.round((total[k] / n) * 10) / 10;
  per.kcal = Math.round(total.kcal / n);
  per.sodium = Math.round(total.sodium / n);
  per.calcium = Math.round(total.calcium / n);
  per.potassium = Math.round(total.potassium / n);
  return { ...seed, diet, allergens: Array.from(allergens), perServing: per, minAge };
}

export const RECIPES: Recipe[] = RECIPE_SEEDS.map(build);
const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));
export const getRecipe = (id: string) => BY_ID.get(id);

export interface RecipeFilter {
  eats?: "any" | Diet;
  avoid?: Allergen[];
  age?: number;
  meal?: MealType;
  kidFriendlyOnly?: boolean;
  maxMinutes?: number;
  query?: string;
}

/** Everything a person can safely eat: respects diet, allergens, age and (for children) kid-friendly curation. */
export function filterRecipes(list: Recipe[], f: RecipeFilter): Recipe[] {
  const avoid = new Set(f.avoid ?? []);
  const q = (f.query ?? "").toLowerCase().trim();
  return list.filter((r) => {
    if (!fitsDiet(r.diet, f.eats ?? "any")) return false;
    if (r.allergens.some((a) => avoid.has(a))) return false;
    if (f.age !== undefined && f.age < r.minAge) return false;
    if (f.age !== undefined && f.age < 13 && !r.kidFriendly) return false;
    if (f.kidFriendlyOnly && !r.kidFriendly) return false;
    if (f.meal && !r.meals.includes(f.meal)) return false;
    if (f.maxMinutes && r.minutes > f.maxMinutes) return false;
    if (q && !(r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || r.ingredients.some((i) => getFood(i.food)!.name.toLowerCase().includes(q) || getFood(i.food)!.aliases.some((a) => a.toLowerCase().includes(q))))) return false;
    return true;
  });
}

/** Ingredient list scaled to `servings` (for the recipe screen and the grocery list). */
export function scaledIngredients(r: Recipe, servings: number) {
  const k = servings / Math.max(1, r.servings);
  return r.ingredients.map((i) => {
    const food = getFood(i.food)!;
    return { foodId: i.food, name: food.name, grams: Math.round(i.grams * k * 10) / 10 };
  });
}

import type { MealItemInput, ManualMeal } from "@/lib/offlineTypes";

/** A recipe (at `scale` servings) as a loggable meal: itemised foods whose totals are the sum of the lines. */
export function mealFromRecipe(r: Recipe, scale: number, mealSession: ManualMeal["mealSession"]): ManualMeal {
  const items: MealItemInput[] = r.ingredients.map((ing) => {
    const food = getFood(ing.food)!;
    const g = (ing.grams / r.servings) * scale;
    const p = portionOf(food, g);
    const grams = Math.round(g * 10) / 10;
    return {
      name: food.name.slice(0, 100), quantity: `${grams} g`,
      calories: p.kcal, protein: p.protein, fat: p.fat, carbs: p.carbs, fiber: p.fiber,
      sodium: p.sodium, iron: p.iron, calcium: p.calcium, vitaminC: p.vitaminC, potassium: p.potassium,
    };
  });
  const sum = (k: keyof MealItemInput) => items.reduce((a, i) => a + ((i[k] as number) ?? 0), 0);
  return {
    name: scale === 1 ? r.name : `${r.name} (${scale}×)`.slice(0, 100),
    mealSession,
    items,
    totalCalories: Math.round(sum("calories")),
    totalProtein: Math.round(sum("protein")),
    totalFat: Math.round(sum("fat")),
    totalCarbs: Math.round(sum("carbs")),
    totalFiber: Math.round(sum("fiber")),
  };
}
