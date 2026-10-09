import { test } from "node:test";
import assert from "node:assert/strict";
import { startOfDayInTz, startOfDayDaysAgo, dateKeyInTz, weekdayInTz, tzOffsetMs, isValidTz } from "../lib/tz";

test("IST offset is +5:30", () => {
  assert.equal(tzOffsetMs("Asia/Kolkata", new Date("2026-10-10T00:00:00Z")), 19_800_000);
});

test("a 2 AM IST snack belongs to THAT local day, not the previous UTC day", () => {
  const snack = new Date("2026-10-09T20:30:00Z"); // 02:00 IST on 10 Oct
  assert.equal(dateKeyInTz("Asia/Kolkata", snack), "2026-10-10");
  assert.equal(dateKeyInTz("UTC", snack), "2026-10-09");
  assert.equal(weekdayInTz("Asia/Kolkata", snack), "Sat");
});

test("start of local day is local midnight (IST 10 Oct 00:00 = 9 Oct 18:30Z)", () => {
  const at = new Date("2026-10-10T06:00:00Z"); // 11:30 IST
  assert.equal(startOfDayInTz("Asia/Kolkata", at).toISOString(), "2026-10-09T18:30:00.000Z");
});

test("a time just after local midnight is already the new day", () => {
  const at = new Date("2026-10-09T18:45:00Z"); // 00:15 IST on 10 Oct
  assert.equal(startOfDayInTz("Asia/Kolkata", at).toISOString(), "2026-10-09T18:30:00.000Z");
  const before = new Date("2026-10-09T18:15:00Z"); // 23:45 IST on 9 Oct
  assert.equal(startOfDayInTz("Asia/Kolkata", before).toISOString(), "2026-10-08T18:30:00.000Z");
});

test("days-ago steps by whole local days, including across a DST change", () => {
  const at = new Date("2026-10-10T06:00:00Z");
  assert.equal(startOfDayDaysAgo("Asia/Kolkata", 6, at).toISOString(), "2026-10-03T18:30:00.000Z");
  // New York leaves DST on 1 Nov 2026: 3 days before 3 Nov is 31 Oct 00:00 EDT (04:00Z)
  assert.equal(startOfDayDaysAgo("America/New_York", 3, new Date("2026-11-03T17:00:00Z")).toISOString(), "2026-10-31T04:00:00.000Z");
});

test("zone validation", () => {
  assert.ok(isValidTz("Asia/Kolkata"));
  assert.ok(!isValidTz("Mars/Olympus"));
  assert.ok(!isValidTz(""));
});

import { calculateActiveStreak } from "../lib/streak";

test("streak counts LOCAL days: 2 AM and 11 PM IST snacks on consecutive days = 2", () => {
  const now = new Date("2026-10-10T08:00:00Z"); // 13:30 IST, 10 Oct
  const logs = ["2026-10-09T20:30:00Z", /* 02:00 IST 10 Oct */ "2026-10-09T17:30:00Z" /* 23:00 IST 9 Oct */];
  assert.equal(calculateActiveStreak(logs, "Asia/Kolkata", now), 2);
  // in UTC the same two meals are both "9 Oct" → a 1-day streak (the old, wrong answer for Indian users)
  assert.equal(calculateActiveStreak(logs, "UTC", now), 1);
});

test("streak: today or yesterday keeps it alive, a gap breaks it", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  assert.equal(calculateActiveStreak(["2026-10-09T08:00:00Z", "2026-10-08T08:00:00Z", "2026-10-07T08:00:00Z"], "Asia/Kolkata", now), 3);
  assert.equal(calculateActiveStreak(["2026-10-08T08:00:00Z"], "Asia/Kolkata", now), 0);
  assert.equal(calculateActiveStreak([], "Asia/Kolkata", now), 0);
  assert.equal(calculateActiveStreak(["2026-10-10T01:00:00Z", "2026-10-08T01:00:00Z"], "Asia/Kolkata", now), 1);
});

import { changeOver, weeklyRate, lossTooFast } from "../lib/weightTrend";

test("weight trend helpers", () => {
  const day = 86_400_000, t0 = Date.parse("2026-09-01T00:00:00Z");
  const pts = [
    { id: "a", kg: 80, at: t0 },
    { id: "b", kg: 79, at: t0 + 14 * day },
    { id: "c", kg: 78, at: t0 + 28 * day },
  ];
  assert.equal(changeOver(pts, 7), -1);   // vs the 14-day-old point
  assert.equal(changeOver(pts, 30), -2);  // falls back to the oldest
  assert.equal(weeklyRate(pts), -0.5);
  assert.equal(lossTooFast(pts), false);
  // 4 kg lost in 2 weeks at 80 kg = 2.5%/week → too fast
  assert.equal(lossTooFast([{ id: "x", kg: 80, at: t0 }, { id: "y", kg: 76, at: t0 + 14 * day }]), true);
  assert.equal(changeOver([{ id: "x", kg: 5, at: 1 }], 7), null);
  assert.equal(weeklyRate([{ id: "x", kg: 80, at: t0 }, { id: "y", kg: 79, at: t0 + 2 * day }]), null);
});
