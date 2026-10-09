import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProfileInput, ageFromBirthdate } from "../lib/profileValidation";

const base = {
  name: "Tester", age: "30", gender: "Male", heightCm: "175", weightKg: "70",
  activityLevel: "Moderately active", primaryGoal: "Maintain",
};

test("valid adult input passes and is normalised", () => {
  const r = validateProfileInput({ ...base, dietaryPreferences: ["Vegan", "Keto"] });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.age, 30);
    assert.equal(r.value.dietaryPreferences, "Vegan,Keto");
    assert.equal(r.value.primaryGoal, "Maintain");
  }
});

test("rejects nonsense numbers (NaN, zero, negative, absurd)", () => {
  for (const patch of [
    { age: "abc" }, { age: "-4" }, { age: "1" }, { age: "200" },
    { heightCm: "0" }, { heightCm: "999" }, { weightKg: "0" }, { weightKg: "5" }, { weightKg: "NaN" },
  ]) {
    const r = validateProfileInput({ ...base, ...patch });
    assert.equal(r.ok, false, JSON.stringify(patch));
  }
});

test("rejects unknown gender / activity / goal", () => {
  assert.equal(validateProfileInput({ ...base, gender: "robot" }).ok, false);
  assert.equal(validateProfileInput({ ...base, activityLevel: "Superhuman" }).ok, false);
  assert.equal(validateProfileInput({ ...base, primaryGoal: "Become a god" }).ok, false);
});

test("under-18s are forced onto Healthy growth and lose adult-only fields", () => {
  const r = validateProfileInput({ ...base, age: "10", weightKg: "32", heightCm: "140", primaryGoal: "Lose weight", bodyFat: "High (25–31%)" });
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.value.primaryGoal, "Healthy growth");
    assert.equal(r.value.bodyFat, null);
  }
});

test("birthdate is the source of truth for age", () => {
  const now = new Date();
  const tenYearsAgo = `${now.getUTCFullYear() - 10}-01-01`;
  const r = validateProfileInput({ ...base, age: "40", birthdate: tenYearsAgo, weightKg: "32", heightCm: "140" });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.value.age, 10);
});

test("future / malformed birthdates are rejected", () => {
  assert.equal(validateProfileInput({ ...base, birthdate: "2999-01-01" }).ok, false);
  assert.equal(validateProfileInput({ ...base, birthdate: "not-a-date" }).ok, false);
});

test("ageFromBirthdate handles birthday not yet reached", () => {
  assert.equal(ageFromBirthdate("2000-06-15", new Date("2026-06-14T00:00:00Z")), 25);
  assert.equal(ageFromBirthdate("2000-06-15", new Date("2026-06-15T00:00:00Z")), 26);
});

test("parent confirmation flag is carried through", () => {
  const r = validateProfileInput({ ...base, age: "8", weightKg: "26", heightCm: "128", parentConfirmed: true });
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.parentConfirmed, true);
});
