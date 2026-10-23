import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReminders, sanitizeSettings, DEFAULT_SETTINGS, GRACE_MIN, type DueContext } from "../lib/reminders";

const IST = "Asia/Kolkata";
// 13:10 IST on Sat 10 Oct 2026 = 07:40Z
const at = (hhmmIst: string) => {
  const [h, m] = hhmmIst.split(":").map(Number);
  return new Date(Date.UTC(2026, 9, 10, h, m) - 330 * 60_000);
};
const ctx = (over: Partial<DueContext> = {}, t = "13:10"): DueContext => ({
  now: at(t), tz: IST, minutesSinceMeal: Infinity, minutesSinceDrink: Infinity,
  waterTotalMl: 0, waterGoalMl: 2200, minutesSinceWeighIn: Infinity, ...over,
});

test("lunch reminder fires at 13:00 IST and up to the grace window, not before or after", () => {
  assert.equal(dueReminders(DEFAULT_SETTINGS, ctx({}, "12:59")).some((r) => r.key.startsWith("meal:lunch")), false);
  assert.equal(dueReminders(DEFAULT_SETTINGS, ctx({}, "13:00")).some((r) => r.key.startsWith("meal:lunch")), true);
  assert.equal(dueReminders(DEFAULT_SETTINGS, ctx({}, "13:29")).some((r) => r.key.startsWith("meal:lunch")), true);
  assert.equal(dueReminders(DEFAULT_SETTINGS, ctx({}, "13:30")).some((r) => r.key.startsWith("meal:lunch")), false);
  assert.equal(GRACE_MIN, 30);
});

test("meal reminder is skipped when a meal was just logged", () => {
  assert.equal(dueReminders(DEFAULT_SETTINGS, ctx({ minutesSinceMeal: 20 })).some((r) => r.key.startsWith("meal:")), false);
  assert.equal(dueReminders(DEFAULT_SETTINGS, ctx({ minutesSinceMeal: 200 })).some((r) => r.key.startsWith("meal:")), true);
});

test("a turned-off slot never fires", () => {
  const s = sanitizeSettings({ meals: { lunch: null } });
  assert.equal(dueReminders(s, ctx()).some((r) => r.key.startsWith("meal:lunch")), false);
});

test("water: every 2h from 09:00 — due at 11:00, not at 10:00; stops at the goal and after a recent drink", () => {
  assert.ok(dueReminders(DEFAULT_SETTINGS, ctx({}, "11:05")).some((r) => r.key.startsWith("water:")));
  assert.ok(!dueReminders(DEFAULT_SETTINGS, ctx({}, "10:05")).some((r) => r.key.startsWith("water:")));
  assert.ok(!dueReminders(DEFAULT_SETTINGS, ctx({ waterTotalMl: 2200 }, "11:05")).some((r) => r.key.startsWith("water:")));
  assert.ok(!dueReminders(DEFAULT_SETTINGS, ctx({ minutesSinceDrink: 30 }, "11:05")).some((r) => r.key.startsWith("water:")));
});

test("water: quiet outside the from/to window (no 3 AM pings)", () => {
  for (const t of ["02:00", "03:00", "07:00", "21:30", "23:00"]) {
    assert.ok(!dueReminders(DEFAULT_SETTINGS, ctx({}, t)).some((r) => r.key.startsWith("water:")), t);
  }
});

test("the same reminder has the same key across runs (so it is sent once), and a different one tomorrow", () => {
  const a = dueReminders(DEFAULT_SETTINGS, ctx({}, "13:05")).find((r) => r.key.startsWith("meal:lunch"))!;
  const b = dueReminders(DEFAULT_SETTINGS, ctx({}, "13:25")).find((r) => r.key.startsWith("meal:lunch"))!;
  assert.equal(a.key, b.key);
  const tomorrow = { ...ctx({}, "13:05"), now: new Date(at("13:05").getTime() + 86_400_000) };
  assert.notEqual(dueReminders(DEFAULT_SETTINGS, tomorrow).find((r) => r.key.startsWith("meal:lunch"))!.key, a.key);
});

test("local midnight is handled in the user's zone, not UTC (00:10 IST is still 'today' for the 00:00 slot)", () => {
  const s = sanitizeSettings({ meals: { breakfast: "00:00" } });
  const r = dueReminders(s, ctx({}, "00:10")).find((x) => x.key.startsWith("meal:breakfast"));
  assert.ok(r);
  assert.ok(r!.key.endsWith("2026-10-10"));
});

test("weigh-in: weekly on the chosen day, skipped if weighed recently", () => {
  const s = sanitizeSettings({ weighIn: { enabled: true, day: 6, time: "08:00" } }); // Saturday
  assert.ok(dueReminders(s, ctx({}, "08:05")).some((r) => r.key.startsWith("weigh:")));
  assert.ok(!dueReminders(s, ctx({ minutesSinceWeighIn: 2 * 24 * 60 }, "08:05")).some((r) => r.key.startsWith("weigh:")));
  const wrongDay = sanitizeSettings({ weighIn: { enabled: true, day: 2, time: "08:00" } });
  assert.ok(!dueReminders(wrongDay, ctx({}, "08:05")).some((r) => r.key.startsWith("weigh:")));
});

test("settings input is sanitised: junk is ignored, defaults fill in, ranges can't invert", () => {
  const s = sanitizeSettings({ meals: { lunch: "25:99", dinner: "21:15", snack: 5 }, water: { everyMin: 7, from: "20:00", to: "10:00", enabled: "yes" }, weighIn: { day: 9 } });
  assert.equal(s.meals.lunch, DEFAULT_SETTINGS.meals.lunch);
  assert.equal(s.meals.dinner, "21:15");
  assert.equal(s.meals.snack, DEFAULT_SETTINGS.meals.snack);
  assert.equal(s.water.everyMin, 120);
  assert.equal(s.water.from, "09:00");
  assert.equal(s.water.to, "21:00");
  assert.equal(s.weighIn.day, 0);
  assert.deepEqual(sanitizeSettings(null), DEFAULT_SETTINGS);
});

import { upcomingWakeups, DEFAULT_SETTINGS } from "../lib/reminders";
test("upcomingWakeups: meal alarms land one minute after the chosen local time, in the right time zone", () => {
  const s = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); s.water.enabled = false; s.weighIn.enabled = false;
  s.meals = { breakfast: null, lunch: "13:00", snack: null, dinner: null };
  const now = new Date("2026-10-23T05:00:00Z"); // 10:30 in Kolkata
  const t = upcomingWakeups(s, "Asia/Kolkata", now, 30);
  assert.equal(new Date(t[0]).toISOString(), "2026-10-23T07:31:00.000Z"); // 13:01 IST
  assert.equal(new Date(t[1]).toISOString(), "2026-10-24T07:31:00.000Z"); // next day
  assert.equal(t.length, 2);
});
test("upcomingWakeups: nothing in the past, nothing when everything is off, water follows the window", () => {
  const off = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); off.meals = { breakfast: null, lunch: null, snack: null, dinner: null }; off.water.enabled = false; off.weighIn.enabled = false;
  assert.deepEqual(upcomingWakeups(off, "Asia/Kolkata", new Date()), []);
  const w = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); w.meals = { breakfast: null, lunch: null, snack: null, dinner: null }; w.weighIn.enabled = false;
  w.water = { enabled: true, everyMin: 120, from: "09:00", to: "21:00" };
  const now = new Date("2026-10-23T07:00:00Z"); // 12:30 IST
  const t = upcomingWakeups(w, "Asia/Kolkata", now, 12);
  const local = t.map((x) => new Date(x + 5.5 * 3600_000).toISOString().slice(11, 16));
  assert.deepEqual(local, ["13:01", "15:01", "17:01", "19:01"]); // 09:00 + k*120 min, only after "now", before 21:00
  assert.ok(t.every((x) => x > now.getTime()));
});
test("upcomingWakeups: weekly weigh-in only on its weekday and the list is capped", () => {
  const g = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); g.meals = { breakfast: null, lunch: null, snack: null, dinner: null }; g.water.enabled = false;
  g.weighIn = { enabled: true, day: 6, time: "08:00" }; // Saturday
  const t = upcomingWakeups(g, "Asia/Kolkata", new Date("2026-10-23T05:00:00Z"), 72); // Fri 10:30 IST → Sat is in range
  assert.equal(t.length, 1);
  assert.equal(new Date(t[0] + 5.5 * 3600_000).toISOString().slice(0, 16), "2026-10-24T08:01");
  const busy = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)); busy.water = { enabled: true, everyMin: 60, from: "00:00", to: "23:59" };
  assert.ok(upcomingWakeups(busy, "Asia/Kolkata", new Date(), 72, 40).length <= 40);
});
