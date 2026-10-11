import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanImport, creditKcal, estimateWorkoutKcal, pickDay, workoutId, weightId, newPairingCode, newDeviceToken, normalizeCode, sha256, LIMITS, MAX_CREDIT_KCAL } from "../lib/activity";

const NOW = Date.parse("2026-10-11T12:00:00Z");

test("workout calorie estimate = (MET − 1) × kg × hours", () => {
  assert.equal(estimateWorkoutKcal("running", 30, 70), Math.round(8 * 70 * 0.5)); // 280
  assert.equal(estimateWorkoutKcal("walking", 60, 60), Math.round(2.5 * 60));     // 150
  assert.equal(estimateWorkoutKcal("yoga", 0, 70), 0);
  assert.equal(estimateWorkoutKcal("other", 45, 25), Math.round(3 * 25 * 0.75));  // a child
});

test("activity credit: off by default, never for under-18s, partial, capped", () => {
  assert.equal(creditKcal({ activeKcal: 600, enabled: false, pct: 50, age: 30 }), 0);
  assert.equal(creditKcal({ activeKcal: 600, enabled: true, pct: 50, age: 30 }), 300);
  assert.equal(creditKcal({ activeKcal: 600, enabled: true, pct: 50, age: 17 }), 0);
  assert.equal(creditKcal({ activeKcal: 600, enabled: true, pct: 100, age: 8 }), 0);
  assert.equal(creditKcal({ activeKcal: 3000, enabled: true, pct: 100, age: 30 }), MAX_CREDIT_KCAL);
  assert.equal(creditKcal({ activeKcal: -50, enabled: true, pct: 50, age: 30 }), 0);
  assert.equal(creditKcal({ activeKcal: 400, enabled: true, pct: 500, age: 30 }), 400, "pct is clamped to 100");
  assert.equal(creditKcal({ activeKcal: 400, enabled: true, pct: 50, age: null }), 200);
});

test("import: valid batch is accepted and normalised", () => {
  const r = cleanImport({ source: "Health-Connect", days: [{ day: "2026-10-10", steps: 8421.4, activeKcal: 312 }],
    workouts: [{ externalId: "abc", startedAt: "2026-10-10T06:00:00Z", minutes: 42, kcal: 310, kind: "running", title: "  Morning run " }],
    weights: [{ at: "2026-10-10T05:00:00Z", kg: 71.26 }] }, NOW);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.source, "health-connect");
    assert.deepEqual(r.value.days, [{ day: "2026-10-10", steps: 8421, activeKcal: 312 }]);
    assert.equal(r.value.workouts[0].title, "Morning run");
    assert.equal(r.value.weights[0].kg, 71.3);
    assert.equal(r.value.warnings.length, 0);
  }
});

test("import: garbage rows are dropped and counted, never crash or get stored", () => {
  const r = cleanImport({ source: "x1", days: [
    { day: "2026-02-31", steps: 100 },            // impossible date
    { day: "2099-01-01", steps: 100 },            // future
    { day: "2026-10-10", steps: -5 },             // negative
    { day: "2026-10-10", steps: 500000 },         // absurd
    { day: "yesterday", steps: 10 },              // not a date
    { day: "2026-10-09", steps: "abc" },          // NaN
    { day: "2026-10-08", steps: 5000, activeKcal: 200 }, // the one good row
  ], workouts: [{ externalId: "", startedAt: "2026-10-10T06:00:00Z", minutes: 30 }, { externalId: "w", startedAt: "2026-10-10T06:00:00Z", minutes: 99999 }, { externalId: "w2", startedAt: "2026-10-10T06:00:00Z", minutes: 30, kcal: 999999 }],
    weights: [{ at: "2026-10-10T05:00:00Z", kg: 3 }, { at: "nope", kg: 70 }, { at: "2026-10-10T05:00:00Z", kg: 900 }] }, NOW);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.days.length, 1); assert.equal(r.value.days[0].day, "2026-10-08");
    assert.equal(r.value.workouts.length, 0); assert.equal(r.value.weights.length, 0);
    assert.match(r.value.warnings[0], /^\d+ items were skipped/);
  }
});

test("import: bad source, wrong types and oversize batches are rejected outright", () => {
  for (const bad of [null, "str", 5, {}, { source: "" }, { source: "A B" }, { source: "../etc" }, { source: "x" }]) assert.equal(cleanImport(bad as any, NOW).ok, false, JSON.stringify(bad));
  const big = { source: "ok1", days: Array.from({ length: LIMITS.days + 1 }, (_, i) => ({ day: "2026-10-10", steps: i })) };
  assert.equal(cleanImport(big, NOW).ok, false);
  assert.equal(cleanImport({ source: "ok1", days: "not-an-array", workouts: 7 }, NOW).ok, true); // non-arrays are treated as empty
});

test("import: repeated days/workouts inside one batch collapse to one (last wins)", () => {
  const r = cleanImport({ source: "ok1", days: [{ day: "2026-10-10", steps: 100 }, { day: "2026-10-10", steps: 900 }],
    workouts: [{ externalId: "a", startedAt: "2026-10-10T06:00:00Z", minutes: 10 }, { externalId: "a", startedAt: "2026-10-10T06:00:00Z", minutes: 20 }] }, NOW);
  assert.ok(r.ok && r.value.days.length === 1 && r.value.days[0].steps === 900 && r.value.workouts.length === 1 && r.value.workouts[0].minutes === 20);
});

test("ids are deterministic (idempotent re-sync) and scoped per profile and source", () => {
  assert.equal(workoutId("p1", "hc", "x"), workoutId("p1", "hc", "x"));
  assert.notEqual(workoutId("p1", "hc", "x"), workoutId("p2", "hc", "x"));
  assert.notEqual(workoutId("p1", "hc", "x"), workoutId("p1", "fit", "x"));
  assert.notEqual(weightId("p1", "hc", "2026-10-10T05:00:00.000Z"), weightId("p1", "hc", "2026-10-10T05:00:01.000Z"));
  assert.match(workoutId("p", "s", "e"), /^wk_[0-9a-f]{32}$/);
});

test("two sources for the same day are not added together (largest wins)", () => {
  const m = pickDay([{ day: "d1", steps: 6000, activeKcal: 200 }, { day: "d1", steps: 8200, activeKcal: 260 }, { day: "d2", steps: 100, activeKcal: 5 }]);
  assert.equal(m.get("d1")!.steps, 8200); assert.equal(m.size, 2);
});

test("pairing codes: 8 readable characters, high entropy, typo-tolerant normalisation", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) { const c = newPairingCode(); assert.match(c, /^[A-HJKMNP-Z2-9]{8}$/); seen.add(c); }
  assert.ok(seen.size > 1990, "codes should essentially never collide");
  assert.equal(normalizeCode("abcd-23k9"), "ABCD23K9");
  assert.equal(normalizeCode(" ab cd 2 3 "), "ABCD23");
});

test("device tokens are long, random and only their hash is meant to be stored", () => {
  const a = newDeviceToken(), b = newDeviceToken();
  assert.notEqual(a, b); assert.ok(a.length >= 40 && a.startsWith("nds_"));
  assert.match(sha256(a), /^[0-9a-f]{64}$/); assert.notEqual(sha256(a), a);
});
