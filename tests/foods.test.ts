import { test } from "node:test";
import assert from "node:assert/strict";
import { FOODS, getFood, portionOf, sumPortions, searchFoods, fitsDiet, constraintsFromProfile } from "../lib/foods";

/** Atwater energy from macros, counting fibre at 2 kcal/g (fibre is part of "carbs"). */
const atwater = (p: { protein: number; fat: number; carbs: number; fiber: number }) =>
  4 * p.protein + 9 * p.fat + 4 * Math.max(0, p.carbs - p.fiber) + 2 * p.fiber;

test("ids are unique and every food has a name, category and servings", () => {
  const ids = new Set<string>();
  for (const f of FOODS) {
    assert.ok(!ids.has(f.id), `duplicate id ${f.id}`);
    ids.add(f.id);
    assert.ok(f.name.length > 1 && f.category.length > 1, f.id);
    assert.ok(f.servings.length >= 1 && f.servings.every((s) => s.grams > 0 && s.label), `${f.id} servings`);
  }
  assert.ok(FOODS.length >= 150);
});

test("energy matches the macros for every food (catches typos in any number)", () => {
  const bad: string[] = [];
  for (const f of FOODS) {
    const p = f.per100;
    const calc = atwater(p);
    // Tolerance: 15 % or 12 kcal (alcohol-free foods; oils/sugar are exact, leafy veg are tiny).
    if (Math.abs(calc - p.kcal) > Math.max(12, p.kcal * 0.15)) bad.push(`${f.id}: listed ${p.kcal}, macros give ${Math.round(calc)}`);
  }
  assert.deepEqual(bad, []);
});

test("physically plausible: macros never exceed 100 g, no negatives, sodium/iron/vitamin C in sane ranges", () => {
  for (const f of FOODS) {
    const p = f.per100;
    for (const [k, v] of Object.entries(p)) assert.ok(Number.isFinite(v) && v >= 0, `${f.id}.${k}`);
    assert.ok(p.protein + p.fat + p.carbs <= 100.5, `${f.id} macros sum to ${p.protein + p.fat + p.carbs}`);
    assert.ok(p.fiber <= p.carbs + 0.01, `${f.id} fibre > carbs`);
    assert.ok(p.kcal <= 900, `${f.id} kcal`);
    assert.ok(p.sodium <= 4000 && p.iron <= 30 && p.vitaminC <= 300, `${f.id} micros`);
  }
});

test("diet flags and allergens are consistent", () => {
  for (const f of FOODS) {
    const a = new Set(f.allergens);
    if (f.diet === "vegan") for (const x of ["milk", "egg", "fish", "shellfish"] as const) assert.ok(!a.has(x), `${f.id} is vegan but lists ${x}`);
    if (f.diet === "vegetarian") for (const x of ["egg", "fish", "shellfish"] as const) assert.ok(!a.has(x), `${f.id} is vegetarian but lists ${x}`);
    if (a.has("fish") || a.has("shellfish")) assert.equal(f.diet, "nonveg", `${f.id} fish must be nonveg`);
    if (a.has("egg")) assert.ok(f.diet === "egg" || f.diet === "vegetarian" /* noodles/dishes made with egg are not vegan */ || f.diet === "nonveg", f.id);
    if (a.has("milk")) assert.notEqual(f.diet, "vegan", `${f.id} has milk but is vegan`);
  }
  // meat & fish category must be non-veg; dairy must not be vegan
  for (const f of FOODS.filter((x) => x.category === "Meat & fish")) assert.equal(f.diet, "nonveg", f.id);
  for (const f of FOODS.filter((x) => x.category === "Dairy")) assert.notEqual(f.diet, "vegan", f.id);
  // known allergen facts
  assert.ok(getFood("peanuts_roasted")!.allergens.includes("peanut"));
  assert.ok(getFood("roti")!.allergens.includes("gluten"));
  assert.ok(getFood("paneer")!.allergens.includes("milk"));
  assert.ok(getFood("tofu_firm")!.allergens.includes("soy"));
});

test("serving sizes are sensible (no 2 kg 'servings')", () => {
  for (const f of FOODS) for (const s of f.servings) assert.ok(s.grams >= 1 && s.grams <= 500, `${f.id} ${s.label}`);
});

test("spot values against well-known reference figures", () => {
  const near = (id: string, key: "kcal" | "protein" | "fat" | "carbs", want: number, tol: number) => {
    const got = getFood(id)!.per100[key];
    assert.ok(Math.abs(got - want) <= tol, `${id} ${key}: ${got} vs ${want}`);
  };
  near("banana", "kcal", 89, 3); near("egg_boiled", "protein", 12.6, 0.7); near("chicken_breast_cooked", "protein", 31, 1.5);
  near("paneer", "fat", 20.8, 3); near("rice_white_cooked", "carbs", 28, 2); near("almonds", "kcal", 579, 20);
  near("cooking_oil", "kcal", 884, 5); near("milk_whole", "kcal", 61, 4); near("dal_masoor_cooked", "protein", 9, 0.8);
});

test("portion maths: 150 g rice, scaling and summing", () => {
  const rice = getFood("rice_white_cooked")!;
  const p = portionOf(rice, 150);
  assert.equal(p.kcal, 195);
  assert.equal(p.carbs, 42.3);
  assert.equal(portionOf(rice, 0).kcal, 0);
  assert.equal(portionOf(rice, -20).kcal, 0, "negative grams clamp to zero");
  const meal = sumPortions([portionOf(rice, 150), portionOf(getFood("dal_tadka")!, 150), portionOf(getFood("roti")!, 80)]);
  assert.equal(meal.kcal, 195 + 147 + 238);
  assert.equal(meal.grams, 380);
});

test("search: Hindi names, prefixes, typos and ranking", () => {
  const top = (q: string) => searchFoods(q, 3).map((f) => f.id);
  assert.equal(top("aloo")[0], "potato_boiled");
  assert.equal(top("chawal")[0], "rice_white_cooked");
  assert.equal(top("dahi")[0], "curd");
  assert.equal(top("roti")[0], "roti");
  assert.equal(top("panir")[0], "paneer");        // one-letter typo
  assert.equal(top("bhindi")[0], "okra");
  assert.equal(top("PALAK")[0], "spinach");        // case-insensitive
  assert.ok(top("banan").includes("banana"));     // prefix
  assert.ok(top("dal").some((id) => id.startsWith("dal_")));
  assert.ok(top("chicken").includes("chicken_breast_cooked"));
  assert.ok(searchFoods("khichdi")[0].id === "khichdi");
  assert.equal(searchFoods("zzzzqqq").length, 0);
  assert.equal(searchFoods("").length, 0);
  assert.equal(searchFoods("   ").length, 0);
  assert.ok(searchFoods("e", 5).length <= 5);
});

test("diet filter: vegan < vegetarian < egg < non-veg", () => {
  assert.ok(fitsDiet("vegan", "vegan") && fitsDiet("vegan", "vegetarian"));
  assert.ok(!fitsDiet("vegetarian", "vegan"));
  assert.ok(fitsDiet("vegetarian", "vegetarian") && !fitsDiet("egg", "vegetarian"));
  assert.ok(fitsDiet("egg", "egg") && fitsDiet("vegetarian", "egg") && !fitsDiet("nonveg", "egg"));
  assert.ok(fitsDiet("nonveg", "any") && fitsDiet("nonveg", "nonveg"));
});

test("profile preferences become filters (conservative for unspecified food allergy)", () => {
  assert.deepEqual(constraintsFromProfile("Vegan,Keto", "None"), { eats: "vegan", avoid: [], jain: false });
  assert.equal(constraintsFromProfile("Vegetarian", null).eats, "vegetarian");
  assert.equal(constraintsFromProfile("Non-vegetarian", null).eats, "any");
  assert.equal(constraintsFromProfile("Eggetarian", null).eats, "egg");
  assert.deepEqual(constraintsFromProfile("Gluten-free,Dairy-free", null).avoid.sort(), ["gluten", "milk"]);
  assert.ok(constraintsFromProfile(null, "Celiac disease").avoid.includes("gluten"));
  const fa = constraintsFromProfile(null, "Food allergy").avoid;
  for (const a of ["peanut", "nuts", "egg", "milk", "fish", "shellfish", "sesame", "soy"]) assert.ok(fa.includes(a as any), a);
  assert.equal(constraintsFromProfile("Jain", null).jain, true);
});
