import { test } from "node:test";
import assert from "node:assert/strict";
import { scanKey, limitMessage } from "../lib/scanQuota";
import { FREE_DAILY_AI_SCANS } from "../lib/plan";

test("the daily allowance follows the person's own local day", () => {
  const t = new Date("2026-10-23T19:00:00Z"); // 00:30 on the 24th in India, 15:00 on the 23rd in New York
  assert.notEqual(scanKey("u1", "Asia/Kolkata", t), scanKey("u1", "America/New_York", t));
  assert.ok(scanKey("u1", "Asia/Kolkata", t).endsWith("2026-10-24"));
  assert.ok(scanKey("u1", "America/New_York", t).endsWith("2026-10-23"));
});
test("same person, same day → same counter; next local midnight → a fresh one", () => {
  const a = scanKey("u1", "Asia/Kolkata", new Date("2026-10-23T05:00:00Z")), b = scanKey("u1", "Asia/Kolkata", new Date("2026-10-23T17:00:00Z")), c = scanKey("u1", "Asia/Kolkata", new Date("2026-10-23T19:00:00Z"));
  assert.equal(a, b); assert.notEqual(b, c);
});
test("the allowance belongs to the account: different accounts never share a counter", () => {
  const t = new Date("2026-10-23T05:00:00Z");
  assert.notEqual(scanKey("owner-a", "Asia/Kolkata", t), scanKey("owner-b", "Asia/Kolkata", t));
});
test("the limit message is plain, mentions the number, the reset and 'coming soon', and the other ways to log", () => {
  const m = limitMessage(10);
  assert.match(m, /10 free AI scans/); assert.match(m, /reset at midnight/); assert.match(m, /coming soon/i); assert.match(m, /search, barcode or manual/);
  assert.equal(FREE_DAILY_AI_SCANS, 10);
});
