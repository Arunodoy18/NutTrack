import { test } from "node:test";
import assert from "node:assert/strict";
import { mapOffProduct } from "../lib/openfoodfacts";

test("per-serving figures are used when the pack declares a serving", () => {
  const a = mapOffProduct({ product_name: "Nutella", brands: "Ferrero", serving_size: "15 g", serving_quantity: 15,
    nutriments: { "energy-kcal_100g": 539, "energy-kcal_serving": 81, proteins_100g: 6.3, proteins_serving: 0.9, fat_100g: 30.9, carbohydrates_100g: 57.5 } })!;
  assert.equal(a.totalCalories, 81);
  assert.equal(a.items[0].estimatedQuantity, "15 g");
  assert.equal(a.name, "Ferrero Nutella");
  assert.equal(a.totalFat, Math.round((30.9 * 15) / 100)); // no per-serving fat → scaled from 100 g
});

test("without a serving size it logs 100 g and says so", () => {
  const a = mapOffProduct({ product_name: "Plain oats", nutriments: { "energy-kcal_100g": 370, proteins_100g: 13, fat_100g: 7, carbohydrates_100g: 60, fiber_100g: 10 } })!;
  assert.equal(a.totalCalories, 370);
  assert.equal(a.items[0].estimatedQuantity, "100 g");
});

test("a product with no name is rejected (never 'Unknown Product')", () => {
  assert.equal(mapOffProduct({ nutriments: { "energy-kcal_100g": 539 } }), null);
  assert.equal(mapOffProduct({ product_name: "   ", nutriments: {} }), null);
});

test("junk values become zero, absurd serving sizes fall back to 100 g, brand isn't duplicated", () => {
  const a = mapOffProduct({ product_name: "Amul Butter", brands: "Amul", serving_quantity: 5000, nutriments: { "energy-kcal_100g": "abc", proteins_100g: -3 } })!;
  assert.equal(a.totalCalories, 0);
  assert.equal(a.totalProtein, 0);
  assert.equal(a.items[0].estimatedQuantity, "100 g");
  assert.equal(a.name, "Amul Butter");
});

import { scaleAnalysis } from "../lib/openfoodfacts";
test("scaleAnalysis scales nutrients and gram quantities, keeps 1x identical", () => {
  const a = { name: "Biscuit", totalCalories: 100, totalProtein: 2, totalFat: 4, totalCarbs: 14, totalFiber: 1, items: [{ name: "Biscuit", calories: 100, protein: 2, fat: 4, carbs: 14, fiber: 1, estimatedQuantity: "30 g" }] };
  assert.deepEqual(scaleAnalysis(a, 1), a);
  const h = scaleAnalysis(a, 0.5);
  assert.equal(h.totalCalories, 50); assert.equal(h.items[0].calories, 50); assert.equal(h.items[0].estimatedQuantity, "15 g");
  assert.equal(scaleAnalysis({ ...a, items: [{ ...a.items[0], estimatedQuantity: "1 bar" }] }, 2).items[0].estimatedQuantity, "2× 1 bar");
  assert.equal(scaleAnalysis(a, 99).totalCalories, 1000, "clamped to 10x");
});
