import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeFullProfile, calculateChildEER, calculateBMI, calculateMacroTargets,
  calculateMicroTargets, generateBuddyCoachTip, isChildAge,
} from "../lib/nutritionEngine";

test("adult male BMR matches Mifflin-St Jeor by hand (10*72+6.25*176-5*28+5)", () => {
  const p = computeFullProfile(72, 176, 28, "Male", "Lightly active", "Maintenance");
  assert.equal(p.bmr, 1685);
  assert.equal(p.tdee, Math.round(1685 * 1.375));
  assert.equal(p.isChild, false);
  assert.equal(p.bmi.label, "Normal");
});

test("child EER follows IOM equations (boy 8y 130cm 26kg active = 1967)", () => {
  assert.equal(calculateChildEER(26, 130, 8, "Male", "Moderately active"), 1967);
});

test("child EER (girl 5y 110cm 18kg low active = 1402)", () => {
  assert.equal(calculateChildEER(18, 110, 5, "Female", "Lightly active"), 1402);
});

test("toddler EER (2y 12kg = 988)", () => {
  assert.equal(calculateChildEER(12, 85, 2, "Female", "Sedentary"), 988);
});

test("children never get a calorie deficit, whatever goal is passed", () => {
  const maint = computeFullProfile(26, 130, 8, "Male", "Moderately active", "Maintenance");
  const lose = computeFullProfile(26, 130, 8, "Male", "Moderately active", "Fat loss");
  assert.equal(lose.macros.calories, maint.macros.calories);
  assert.equal(lose.macros.calories, 1967);
});

test("child BMI is labelled Growing, not adult Underweight/Overweight", () => {
  assert.equal(calculateBMI(20, 125, 8).label, "Growing");
  assert.equal(calculateBMI(20, 125).label, "Underweight"); // adult default unchanged
  const p = computeFullProfile(20, 125, 8, "Female", "Sedentary", "Fat loss");
  assert.equal(p.metabolicHealth, "Growing");
});

test("child macros are within AMDR and add up to ~the calorie target", () => {
  const m = calculateMacroTargets(1967, "Maintenance", 26, "Male", 8);
  assert.equal(m.proteinG, 50);
  assert.equal(m.fatG, 66);
  assert.equal(m.fiberG, 28);
  const kcal = m.proteinG * 4 + m.fatG * 9 + m.carbsG * 4;
  assert.ok(Math.abs(kcal - 1967) <= 6, `macro kcal ${kcal}`);
  const proteinPct = (m.proteinG * 4) / 1967;
  assert.ok(proteinPct >= 0.1 && proteinPct <= 0.3);
});

test("adult calorie floors protect against unsafe fat-loss targets", () => {
  assert.equal(calculateMacroTargets(1400, "Fat loss", 55, "Female", 30).calories, 1200);
  assert.equal(calculateMacroTargets(1700, "Fat loss", 70, "Male", 30).calories, 1500);
});

test("micronutrient targets by age band (IOM DRIs)", () => {
  assert.deepEqual(calculateMicroTargets(5, "Male"), { sodium: 1500, iron: 10, calcium: 1000, vitaminC: 25 });
  assert.deepEqual(calculateMicroTargets(15, "Female"), { sodium: 2300, iron: 15, calcium: 1300, vitaminC: 65 });
  assert.equal(calculateMicroTargets(30, "Female").iron, 18);
  assert.equal(calculateMicroTargets(60, "Female").calcium, 1200);
});

test("older adults get the lower fibre AI", () => {
  assert.ok(calculateMacroTargets(2200, "Maintenance", 70, "Male", 60).fiberG <= 30);
});

test("kid coach tips are positive and never mention being over target", () => {
  const goals = { calories: 1700, protein: 40, carbs: 220, fat: 55, fiber: 24 };
  const over = { calories: 2200, protein: 80, carbs: 300, fat: 80, fiber: 30 };
  const tip = generateBuddyCoachTip(over, goals, new Date("2026-01-01T13:00:00"), 7);
  assert.ok(!/over|slightly|target/i.test(tip), tip);
  assert.ok(isChildAge(17) && !isChildAge(18));
});

import { dailyWaterGoalMl } from "../lib/hydration";

test("water goals follow IOM adequate intakes by age/sex, with an activity bump", () => {
  assert.equal(dailyWaterGoalMl(2, "Female"), 900);
  assert.equal(dailyWaterGoalMl(6, "Male"), 1200);
  assert.equal(dailyWaterGoalMl(10, "Female"), 1600);
  assert.equal(dailyWaterGoalMl(10, "Male"), 1800);
  assert.equal(dailyWaterGoalMl(16, "Male"), 2600);
  assert.equal(dailyWaterGoalMl(30, "Female"), 2200);
  assert.equal(dailyWaterGoalMl(30, "Male"), 3000);
  assert.equal(dailyWaterGoalMl(30, "Female", "Moderately active"), 2450);
  assert.equal(dailyWaterGoalMl(30, "Male", "Athlete"), 3500);
  assert.equal(dailyWaterGoalMl(9, "Male", "Very active"), 2050); // younger kids get a smaller bump
});
