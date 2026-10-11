import { test } from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { csvCell, toCsv, buildCsvFiles, buildZip, buildJson, readme, summarizeByDay, averages, type ExportBundle } from "../lib/exportData";

const bundle = (): ExportBundle => ({
  exportedAt: "2026-10-11T10:00:00.000Z", timezone: "Asia/Kolkata", scope: "family", rangeDays: null,
  profiles: [
    { id: "p1", name: "Asha", relation: null, isOwner: true, email: "asha@example.com", age: 34, gender: "Female", birthdate: null, heightCm: 165, weightKg: 62, activityLevel: "Lightly active", primaryGoal: "Maintain", dietaryPreferences: "Vegetarian", medicalConditions: null, createdAt: "2026-09-01T00:00:00Z" },
    { id: "p2", name: "Aarav", relation: "child", isOwner: false, age: 8, gender: "Male", birthdate: null, heightCm: 128, weightKg: 26, activityLevel: "Moderately active", primaryGoal: "Healthy growth", dietaryPreferences: null, medicalConditions: "Food allergy", createdAt: "2026-09-02T00:00:00Z" },
  ],
  goals: [{ profileId: "p1", createdAt: "2026-09-01T00:00:00Z", calories: 1808, protein: 87, fat: 60, carbs: 220, fiber: 25, sodium: 2300, iron: 18, calcium: 1000, vitaminC: 75 }],
  meals: [
    { id: "m1aaaaaaaa", profileId: "p1", timestamp: "2026-10-09T20:30:00Z", session: "Snack", name: "Late snack, \"special\"", calories: 321, protein: 5, fat: 5, carbs: 40, fiber: 2, sodium: 100, iron: 1, calcium: 20, vitaminC: 0, potassium: 50, hasPhoto: true,
      items: [{ name: "Biscuit", quantity: "4 biscuits", calories: 321, protein: 5, fat: 5, carbs: 40, fiber: 2, sodium: 100 }], photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg==" },
    { id: "m2bbbbbbbb", profileId: "p2", timestamp: "2026-10-10T07:00:00Z", session: "Breakfast", name: "=HYPERLINK(\"http://evil.example\",\"click\")", calories: 300, protein: 10, fat: 6, carbs: 45, fiber: 5, sodium: 200, iron: 2, calcium: 100, vitaminC: 5, potassium: 100, hasPhoto: false, items: [] },
  ],
  water: [{ id: "w1", profileId: "p1", timestamp: "2026-10-10T08:00:00Z", amountMl: 250 }],
  weight: [{ id: "g1", profileId: "p1", timestamp: "2026-10-10T01:00:00Z", weightKg: 62.4 }],
  groceryList: [{ name: "Paneer (250 g)", purchased: false, addedAt: "2026-10-10T00:00:00Z" }],
});

test("CSV cells: quoting, newlines, unicode and null", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
  assert.equal(csvCell(12.5), "12.5");
  assert.equal(csvCell(NaN), "");
  assert.equal(csvCell("दाल तड़का"), "दाल तड़का");
});

test("CSV injection: formula-looking text is neutralised, real numbers/negatives are not", () => {
  for (const evil of ["=1+1", "+cmd|' /C calc'!A0", "-2+3", "@SUM(A1)", "\t=1", "\r=1", '=HYPERLINK("http://x","y")']) {
    assert.ok(csvCell(evil).replace(/^"/, "").startsWith("'"), `not neutralised: ${evil}`);
  }
  assert.equal(csvCell("-5"), "-5");
  assert.equal(csvCell("-5.25"), "-5.25");
  assert.equal(csvCell(-5), "-5");
  assert.equal(csvCell("2026-10-10"), "2026-10-10");
});

test("toCsv adds a UTF-8 BOM and CRLF rows", () => {
  const out = toCsv(["a", "b"], [[1, "x"], [2, "y"]]);
  assert.ok(out.startsWith("﻿a,b\r\n"));
  assert.ok(out.endsWith("2,y\r\n"));
});

test("meals.csv uses LOCAL dates/times (a 2 AM IST snack is on the IST date) and names the profile", () => {
  const meals = buildCsvFiles(bundle())["meals.csv"].split("\r\n");
  assert.ok(meals[0].includes("profile,date,time"));
  assert.ok(meals[1].startsWith("Asha,2026-10-10,02:00,Snack,"), meals[1]);
  assert.ok(meals[1].includes('"Late snack, ""special"""'));
  assert.ok(meals[2].startsWith("Aarav,2026-10-10,12:30,Breakfast,"), meals[2]);
  assert.ok(meals[2].includes(`"'=HYPERLINK(`), "formula must be quoted AND apostrophe-prefixed: " + meals[2]);
});

test("every CSV has a header and the right number of rows", () => {
  const f = buildCsvFiles(bundle());
  assert.deepEqual(Object.keys(f).sort(), ["daily_targets.csv", "grocery_list.csv", "meal_items.csv", "meals.csv", "profiles.csv", "water.csv", "weight.csv"]);
  const rows = (name: string) => f[name].trim().split("\r\n").length - 1;
  assert.equal(rows("profiles.csv"), 2); assert.equal(rows("meals.csv"), 2); assert.equal(rows("meal_items.csv"), 1);
  assert.equal(rows("water.csv"), 1); assert.equal(rows("weight.csv"), 1); assert.equal(rows("grocery_list.csv"), 1);
});

test("profiles.csv never carries an email, password or token", () => {
  const all = Object.values(buildCsvFiles(bundle())).join("\n") + buildJson(bundle());
  assert.ok(!/password|token|signature|razorpay/i.test(all));
});

test("zip contains README + all CSVs; photos only when asked", () => {
  const without = unzipSync(buildZip(bundle(), false));
  assert.ok(without["README.txt"] && without["meals.csv"] && without["profiles.csv"]);
  assert.ok(!Object.keys(without).some((k) => k.startsWith("photos/")));
  const withP = unzipSync(buildZip(bundle(), true));
  const photo = Object.keys(withP).find((k) => k.startsWith("photos/"));
  assert.ok(photo && photo.endsWith(".jpg") && photo.includes("2026-10-10"), String(photo));
  assert.ok(withP[photo!].length > 0);
  assert.ok(strFromU8(withP["meals.csv"]).includes("Late snack"));
});

test("JSON export is valid, complete, and excludes bulky photo data", () => {
  const j = JSON.parse(buildJson(bundle()));
  assert.equal(j.profiles.length, 2);
  assert.equal(j.meals.length, 2);
  assert.equal(j.meals[0].hasPhoto, true);
  assert.equal(j.meals[0].photo, undefined);
  assert.equal(j.timezone, "Asia/Kolkata");
});

test("readme states the scope and the privacy promise", () => {
  const r = readme({ ...bundle(), scope: "profile", rangeDays: 30 });
  assert.ok(r.includes("one person") && r.includes("last 30 days") && r.includes("never included"));
});

test("daily summary and averages (water, calories) per person", () => {
  const b = bundle();
  const days = summarizeByDay(b, "p1");
  assert.deepEqual(days.map((d) => d.date), ["2026-10-10"]);
  assert.equal(days[0].kcal, 321); assert.equal(days[0].waterMl, 250);
  const avg = averages([{ date: "a", kcal: 2000, protein: 80, carbs: 250, fat: 70, waterMl: 2000, meals: 3 }, { date: "b", kcal: 1000, protein: 40, carbs: 100, fat: 30, waterMl: 0, meals: 0 }, { date: "c", kcal: 1800, protein: 70, carbs: 200, fat: 60, waterMl: 1000, meals: 2 }]);
  assert.equal(avg.loggedDays, 2); assert.equal(avg.kcal, 1900); // the day with no meals doesn't drag the average down
});
