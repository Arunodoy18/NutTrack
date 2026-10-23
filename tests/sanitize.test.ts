import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText, deepClean, normalizeEmail, readJson, isUniqueViolation } from "../lib/sanitize";

test("cleanText strips hidden characters, collapses spaces, and caps by code points", () => {
  assert.equal(cleanText("  a\u0000b \n\t c  ", 20), "ab c");
  assert.equal(cleanText("‮evil‬", 20), "evil");
  assert.equal(Array.from(cleanText("😀".repeat(80), 40)).length, 40);
  assert.equal(cleanText("😀".repeat(80), 40).includes("�"), false, "no half emoji");
  assert.equal(cleanText(123 as any, 5), "");
  assert.equal(cleanText("x".repeat(5000), 100).length, 100);
});
test("deepClean removes NUL/control characters everywhere in a body, but keeps newlines", () => {
  const out: any = deepClean({ a: "x\u0000y", b: ["k\u0001", { c: "ok\nline" }], n: 5, t: true, z: null });
  assert.deepEqual(out, { a: "xy", b: ["k", { c: "ok\nline" }], n: 5, t: true, z: null });
});
test("normalizeEmail makes capitals, spaces and look-alike forms equal", () => {
  assert.equal(normalizeEmail(" Asha@Gmail.COM "), "asha@gmail.com");
  assert.equal(normalizeEmail("ＡＳＨＡ@gmail.com"), "asha@gmail.com"); // full-width letters
  assert.equal(normalizeEmail("a\u0000@b.co"), "a@b.co");
  assert.equal(normalizeEmail(undefined), "");
});
test("readJson never throws: broken, empty or non-object bodies become {}", async () => {
  const mk = (b: string) => new Request("http://x", { method: "POST", body: b });
  assert.deepEqual(await readJson(mk("{not json")), {});
  assert.deepEqual(await readJson(mk("")), {});
  assert.deepEqual(await readJson(mk("5")), {});
  assert.deepEqual(await readJson(mk('{"a":"b\\u0000c"}')), { a: "bc" });
});
test("isUniqueViolation recognises Postgres duplicate-key errors", () => {
  assert.ok(isUniqueViolation({ code: "23505" }));
  assert.ok(isUniqueViolation(new Error('duplicate key value violates unique constraint "user_email_unique"')));
  assert.equal(isUniqueViolation(new Error("connection reset")), false);
});
