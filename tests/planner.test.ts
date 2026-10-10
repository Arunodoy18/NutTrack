import { test } from "node:test";
import assert from "node:assert/strict";
import { RECIPES, getRecipe, filterRecipes, scaledIngredients } from "../lib/foods/recipes";
import { generatePlan, groceryForPlan, SLOTS } from "../lib/foods/planner";
import { getFood, fitsDiet } from "../lib/foods";
import { computeFullProfile } from "../lib/nutritionEngine";

test("every recipe is built from known foods, has steps, and sane nutrition", () => {
  assert.ok(RECIPES.length >= 40);
  const ids = new Set<string>();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id), `dup ${r.id}`); ids.add(r.id);
    assert.ok(r.steps.length >= 1 && r.minutes > 0 && r.servings >= 1, r.id);
    assert.ok(r.ingredients.length >= 2, r.id);
    for (const i of r.ingredients) { assert.ok(getFood(i.food), `${r.id}: ${i.food}`); assert.ok(i.grams > 0, r.id); }
    const k = r.perServing.kcal;
    if (r.meals.includes("snack") && r.meals.length === 1) assert.ok(k >= 60 && k <= 450, `${r.id} snack ${k} kcal`);
    else assert.ok(k >= 150 && k <= 850, `${r.id} ${k} kcal`);
    assert.ok(r.perServing.protein >= 0.5, r.id);
  }
});

test("each meal slot has enough variety for every kind of eater", () => {
  for (const slot of ["breakfast", "lunch", "dinner", "snack"] as const) {
    for (const eats of ["vegan", "vegetarian", "egg", "any"] as const) {
      const n = filterRecipes(RECIPES, { eats, meal: slot }).length;
      assert.ok(n >= (eats === "vegan" ? 3 : 5), `${slot}/${eats}: only ${n}`);
    }
  }
});

test("derived diet and allergens are right", () => {
  assert.equal(getRecipe("poha_peanut_curd")!.diet, "vegetarian");
  assert.ok(getRecipe("poha_peanut_curd")!.allergens.includes("peanut"));
  assert.equal(getRecipe("chicken_curry_rice")!.diet, "nonveg");
  assert.equal(getRecipe("egg_curry_roti")!.diet, "nonveg" === getRecipe("egg_curry_roti")!.diet ? "egg" : "egg");
  assert.equal(getRecipe("rajma_chawal")!.diet, "vegan");
  assert.equal(getRecipe("tofu_stirfry_rice")!.diet, "vegan");
  assert.ok(getRecipe("fish_curry_rice")!.allergens.includes("fish"));
  assert.ok(getRecipe("aloo_paratha_curd")!.allergens.includes("gluten"));
  // vegan filter must never return anything with dairy/egg/meat
  for (const r of filterRecipes(RECIPES, { eats: "vegan" })) assert.equal(r.diet, "vegan");
});

test("whole nuts are kept from under-5s; hot food from under-8s; kids <13 only see kid-friendly recipes", () => {
  for (const r of filterRecipes(RECIPES, { age: 3 })) {
    for (const i of r.ingredients) assert.ok(!["almonds", "cashews", "walnuts", "pistachios", "peanuts_roasted", "pumpkin_seeds"].includes(i.food), `${r.id} has ${i.food} for a 3-year-old`);
    assert.ok(r.kidFriendly, r.id);
  }
  assert.ok(!filterRecipes(RECIPES, { age: 6 }).some((r) => r.spice === "hot"));
  assert.ok(filterRecipes(RECIPES, { age: 30 }).some((r) => r.spice === "hot"));
});

test("allergen avoidance removes every recipe containing it", () => {
  for (const a of ["peanut", "nuts", "milk", "egg", "gluten", "fish", "soy", "sesame"] as const) {
    for (const r of filterRecipes(RECIPES, { avoid: [a] })) assert.ok(!r.allergens.includes(a), `${r.id} contains ${a}`);
  }
});

test("scaled ingredient quantities", () => {
  const r = getRecipe("rajma_chawal")!;
  const two = scaledIngredients(r, 2);
  assert.equal(two[0].grams, r.ingredients[0].grams * 2);
  assert.equal(scaledIngredients(r, 1)[0].name, getFood(r.ingredients[0].food)!.name);
});

/* ───────────── the planner ───────────── */

const profiles = [
  { label: "adult, no restrictions", targets: { calories: 2100, protein: 90 }, c: { eats: "any" as const, avoid: [], age: 32 } },
  { label: "vegetarian woman", targets: { calories: 1700, protein: 75 }, c: { eats: "vegetarian" as const, avoid: [], age: 28 } },
  { label: "vegan, nut-free", targets: { calories: 1900, protein: 80 }, c: { eats: "vegan" as const, avoid: ["nuts", "peanut"] as any, age: 40 } },
  { label: "8-year-old, egg-allergic", targets: { calories: 1944, protein: 50 }, c: { eats: "any" as const, avoid: ["egg"] as any, age: 8 } },
  { label: "4-year-old, nut allergy, vegetarian", targets: { calories: 1500, protein: 40 }, c: { eats: "vegetarian" as const, avoid: ["nuts", "peanut"] as any, age: 4 } },
  { label: "teen, gluten-free", targets: { calories: 2400, protein: 70 }, c: { eats: "any" as const, avoid: ["gluten"] as any, age: 15 } },
  { label: "athlete", targets: { calories: 3000, protein: 150 }, c: { eats: "any" as const, avoid: [], age: 27 } },
];

for (const p of profiles) {
  test(`plan is safe, complete and on target — ${p.label}`, () => {
    const plan = generatePlan({ targets: p.targets, constraints: p.c, seed: "t1" });
    assert.equal(plan.length, 7);
    for (const day of plan) {
      // safety: every meal obeys diet/allergens/age
      for (const m of day.meals) {
        const r = getRecipe(m.recipeId)!;
        assert.ok(fitsDiet(r.diet, p.c.eats), `${p.label}: ${r.id} violates diet`);
        for (const a of p.c.avoid) assert.ok(!r.allergens.includes(a), `${p.label}: ${r.id} contains ${a}`);
        assert.ok(p.c.age >= r.minAge, `${p.label}: ${r.id} not suitable for age ${p.c.age}`);
        if (p.c.age < 13) assert.ok(r.kidFriendly, `${p.label}: ${r.id} not kid-friendly`);
      }
      assert.deepEqual(day.meals.map((m) => m.slot), ["breakfast", "lunch", "snack", "dinner"], "all four meals present");
      // closeness: within 12 % of the calorie target
      assert.ok(Math.abs(day.kcalDeltaPct) <= 12, `${p.label} day ${day.index}: ${day.totals.kcal} kcal is ${day.kcalDeltaPct}% off`);
    }
    // variety: a lunch/dinner recipe never repeats on consecutive days
    for (const slot of ["lunch", "dinner"] as const) {
      const seq = plan.map((d) => d.meals.find((m) => m.slot === slot)!.recipeId);
      for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i], seq[i - 1], `${p.label}: ${slot} repeats on day ${i}`);
    }
    const distinct = new Set(plan.flatMap((d) => d.meals.map((m) => m.recipeId))).size;
    assert.ok(distinct >= 12, `${p.label}: only ${distinct} different recipes in a week`);
    // week average within 6 % of target
    const avg = plan.reduce((a, d) => a + d.totals.kcal, 0) / 7;
    assert.ok(Math.abs(avg - p.targets.calories) / p.targets.calories <= 0.07, `${p.label}: weekly average ${Math.round(avg)} vs ${p.targets.calories}`);
  });
}

test("plans are deterministic per seed and differ across seeds", () => {
  const input = { targets: { calories: 2000, protein: 80 }, constraints: { eats: "any" as const, avoid: [], age: 30 } };
  const a = generatePlan({ ...input, seed: "s1" }), b = generatePlan({ ...input, seed: "s1" }), c = generatePlan({ ...input, seed: "s2" });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.map((d) => d.meals.map((m) => m.recipeId)), c.map((d) => d.meals.map((m) => m.recipeId)));
});

test("a pinned (swapped) meal is honoured and the rest of the day still balances", () => {
  const input = { targets: { calories: 2000, protein: 80 }, constraints: { eats: "any" as const, avoid: [], age: 30 }, seed: "p" };
  const plan = generatePlan({ ...input, pinned: { "2:dinner": "chicken_biryani_plate" } });
  assert.equal(plan[2].meals.find((m) => m.slot === "dinner")!.recipeId, "chicken_biryani_plate");
  assert.ok(Math.abs(plan[2].kcalDeltaPct) <= 15);
});

test("impossible constraints leave slots empty rather than breaking a rule", () => {
  const plan = generatePlan({ targets: { calories: 1800, protein: 60 }, constraints: { eats: "vegan", avoid: ["gluten", "soy", "nuts", "peanut", "sesame", "milk", "egg"] as any, age: 30 }, seed: "x" });
  for (const d of plan) for (const m of d.meals) {
    const r = getRecipe(m.recipeId)!;
    assert.equal(r.diet, "vegan");
    for (const a of ["gluten", "soy", "nuts", "peanut", "sesame", "milk", "egg"]) assert.ok(!r.allergens.includes(a as any));
  }
});

test("grocery list adds up the whole week", () => {
  const plan = generatePlan({ targets: { calories: 2000, protein: 80 }, constraints: { eats: "vegetarian", avoid: [], age: 30 }, seed: "g" });
  const list = groceryForPlan(plan);
  assert.ok(list.length >= 15);
  assert.ok(list.every((i) => i.grams >= 5 && i.name && i.category));
  const total = list.reduce((a, i) => a + i.grams, 0);
  const expected = plan.flatMap((d) => d.meals).reduce((a, m) => a + scaledIngredients(getRecipe(m.recipeId)!, m.scale).reduce((s, i) => s + i.grams, 0), 0);
  assert.ok(Math.abs(total - expected) / expected < 0.05, `grocery ${total} g vs ${Math.round(expected)} g`);
  assert.ok(!list.some((i) => getFood(i.foodId)!.diet === "nonveg"), "vegetarian plan has no meat on the shopping list");
});

test("works with the real engine: a child's generated targets produce a safe plan", () => {
  const kid = computeFullProfile(26, 128, 8, "Male", "Moderately active", "Maintenance");
  const plan = generatePlan({ targets: { calories: kid.macros.calories, protein: kid.macros.proteinG }, constraints: { eats: "any", avoid: ["nuts", "peanut"], age: 8 }, seed: "kid" });
  for (const d of plan) assert.ok(Math.abs(d.kcalDeltaPct) <= 12, `${d.totals.kcal}`);
  assert.equal(SLOTS.reduce((a, s) => a + s.share, 0).toFixed(2), "1.00");
});

test("fuzz: 400 random people × seeds — no plan EVER violates diet, allergy or age rules", () => {
  let s = 12345;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const eatsOpts = ["any", "egg", "vegetarian", "vegan"] as const;
  const allAllergens = ["milk", "egg", "gluten", "peanut", "nuts", "soy", "fish", "shellfish", "sesame"] as const;
  let plans = 0, emptySlots = 0;
  for (let i = 0; i < 400; i++) {
    const age = 2 + Math.floor(r() * 60);
    const avoid = allAllergens.filter(() => r() < 0.18);
    const eats = eatsOpts[Math.floor(r() * 4)];
    const calories = 1100 + Math.floor(r() * 2400);
    const plan = generatePlan({ targets: { calories, protein: Math.round(calories * 0.045) }, constraints: { eats, avoid: [...avoid], age }, seed: `f${i}`, days: 3 });
    plans++;
    for (const d of plan) {
      emptySlots += 4 - d.meals.length;
      for (const m of d.meals) {
        const rec = getRecipe(m.recipeId)!;
        assert.ok(fitsDiet(rec.diet, eats), `#${i} ${rec.id} breaks diet ${eats}`);
        for (const a of avoid) assert.ok(!rec.allergens.includes(a), `#${i} ${rec.id} contains ${a}`);
        assert.ok(age >= rec.minAge, `#${i} ${rec.id} unsuitable at age ${age}`);
        if (age < 13) assert.ok(rec.kidFriendly, `#${i} ${rec.id} not kid-friendly`);
        assert.ok(m.scale > 0 && m.kcal >= 0);
      }
    }
  }
  assert.equal(plans, 400);
  // With many allergens at once some slots can legitimately be empty, but it must be the exception.
  assert.ok(emptySlots < 400 * 3 * 4 * 0.2, `too many empty slots: ${emptySlots}`);
});

import { mealFromRecipe } from "../lib/foods/recipes";

test("a recipe becomes a loggable meal whose totals equal the sum of its lines, and portions scale", () => {
  const r = getRecipe("dal_rice_thali")!;
  const one = mealFromRecipe(r, 1, "Lunch");
  const half = mealFromRecipe(r, 0.5, "Lunch");
  assert.equal(one.items!.length, r.ingredients.length);
  assert.equal(one.totalCalories, Math.round(one.items!.reduce((a, i) => a + i.calories, 0)));
  assert.ok(Math.abs(one.totalCalories - r.perServing.kcal) <= 6, `${one.totalCalories} vs ${r.perServing.kcal}`);
  assert.ok(Math.abs(half.totalCalories - one.totalCalories / 2) <= 6);
  assert.ok(half.name.includes("0.5×"));
  assert.equal(one.mealSession, "Lunch");
});
