import { test } from "node:test";
import assert from "node:assert/strict";
import { kgToLb, lbToKg, showWeight, toKg, showWeightDelta } from "../lib/units";

test("kg <-> lb conversions round-trip", () => {
  assert.equal(Math.round(kgToLb(70) * 10) / 10, 154.3);
  assert.equal(toKg(154.3, "lb"), 70);
  assert.equal(toKg(62.5, "kg"), 62.5);
  assert.ok(Math.abs(lbToKg(kgToLb(81.7)) - 81.7) < 1e-9);
});
test("display helpers keep one decimal and never mutate storage units", () => {
  assert.equal(showWeight(62.5, "kg"), "62.5");
  assert.equal(showWeight(62.5, "lb"), "137.8");
  assert.equal(showWeight(70, "kg"), "70");
  assert.equal(showWeightDelta(-1, "lb"), -2.2);
});
