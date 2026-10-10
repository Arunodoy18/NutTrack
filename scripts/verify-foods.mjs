// Spot-checks our reference foods against USDA FoodData Central (SR Legacy / Foundation).
//   USDA_API_KEY=xxxx node scripts/verify-foods.mjs          (free key: https://fdc.nal.usda.gov/api-key-signup)
// Without a key it uses DEMO_KEY (≈30 requests/hour), so only a sample is checked.
import { FOODS } from "../lib/foods/data.ts";

const KEY = process.env.USDA_API_KEY || "DEMO_KEY";
// our id → USDA query + a phrase the USDA description must contain
const MAP = {
  rice_white_cooked: ["rice white long-grain cooked", "rice, white"], rice_brown_cooked: ["rice brown cooked", "rice, brown"],
  dal_masoor_cooked: ["lentils mature seeds cooked boiled without salt", "lentils"], rajma_cooked: ["kidney beans red cooked boiled", "kidney"],
  egg_boiled: ["egg whole cooked hard-boiled", "hard-boiled"], chicken_breast_cooked: ["chicken breast meat only roasted", "chicken, broilers"],
  milk_whole: ["milk whole 3.25% milkfat", "milk, whole"], curd: ["yogurt plain whole milk", "yogurt, plain, whole"],
  banana: ["bananas raw", "bananas, raw"], apple: ["apples raw with skin", "apples, raw, with skin"],
  potato_boiled: ["potatoes boiled cooked without skin", "potatoes, boiled"], spinach: ["spinach raw", "spinach, raw"],
  almonds: ["nuts almonds", "almonds"], oats_dry: ["cereals oats regular quick not fortified dry", "oats"],
  cheese_cheddar: ["cheese cheddar", "cheese, cheddar"], butter: ["butter salted", "butter, salted"],
  salmon_cooked: ["fish salmon atlantic farmed cooked dry heat", "salmon, atlantic, farmed, cooked"], tofu_firm: ["tofu raw firm prepared with calcium sulfate", "tofu"],
  mango: ["mangos raw", "mangos, raw"], orange: ["oranges raw all commercial varieties", "oranges, raw"],
  tomato: ["tomatoes red ripe raw", "tomatoes, red"], carrot: ["carrots raw", "carrots, raw"],
  peanut_butter: ["peanut butter smooth style", "peanut butter"], honey: ["honey", "honey"],
};
const nutr = (food, id) => food.foodNutrients.find((n) => n.nutrientId === id)?.value;
let bad = 0, checked = 0;
for (const [id, [q, must]] of Object.entries(MAP)) {
  const ours = FOODS.find((f) => f.id === id).per100;
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${KEY}&dataType=SR%20Legacy&pageSize=5&query=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (res.status === 429) { console.log("RATE LIMITED — stop here; checked", checked); break; }
  const json = await res.json();
  const hit = (json.foods || []).find((f) => f.description.toLowerCase().includes(must.toLowerCase())) || json.foods?.[0];
  if (!hit) { console.log(`?  ${id}: no USDA match for "${q}"`); continue; }
  const u = { kcal: nutr(hit, 1008), protein: nutr(hit, 1003), fat: nutr(hit, 1004), carbs: nutr(hit, 1005) };
  const diffs = Object.entries(u).map(([k, v]) => [k, v, ours[k]]).filter(([, v]) => v !== undefined);
  const off = diffs.filter(([k, v, o]) => Math.abs(v - o) > Math.max(k === "kcal" ? 25 : 2.5, v * 0.15));
  checked++;
  if (off.length) { bad++; console.log(`✗ ${id.padEnd(24)} vs "${hit.description.slice(0, 50)}": ` + off.map(([k, v, o]) => `${k} ours ${o} / USDA ${v}`).join("; ")); }
  else console.log(`✓ ${id.padEnd(24)} ~ "${hit.description.slice(0, 55)}"`);
  await new Promise((r) => setTimeout(r, 1500));
}
console.log(`\nchecked ${checked}, outside tolerance ${bad}`);
process.exit(bad ? 1 : 0);
