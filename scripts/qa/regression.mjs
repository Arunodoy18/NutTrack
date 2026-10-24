// Production regression suite (disposable accounts, cleaned up at the end).  node scripts/qa/regression.mjs
import pg from "pg";
import { config } from "dotenv";
import { createHash } from "node:crypto";
config({ path: new URL("../../.env.local", import.meta.url).pathname, quiet: true });
const B = process.env.BASE || "https://dietbuddy.buildc3.tech";
const rand = Math.random().toString(36).slice(2, 8);
const results = [];
const check = (name, ok, extra = "") => { results.push(!!ok); console.log(ok ? "PASS" : "FAIL", name, extra); };
const J = { "content-type": "application/json" };
const rf = async (...a) => { for (let i = 0; i < 4; i++) { try { return await fetch(...a); } catch (e) { if (i === 3) throw e; await new Promise((r) => setTimeout(r, 1000)); } } };

class Client {
  constructor() { this.jar = {}; }
  cookie() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  absorb(res) { for (const c of res.headers.getSetCookie()) { const [nv] = c.split(";"); const i = nv.indexOf("="); const k = nv.slice(0, i), v = nv.slice(i + 1); if (/Max-Age=0|expires=Thu, 01 Jan 1970/i.test(c) || v === "") delete this.jar[k]; else this.jar[k] = v; } }
  async f(path, init = {}) { const res = await rf(B + path, { ...init, redirect: "manual", headers: { ...(init.body ? J : {}), cookie: this.cookie(), ...(init.headers || {}) } }); this.absorb(res); return res; }
  async json(path, init) { const r = await this.f(path, init); return { http: r.status, body: await r.json().catch(() => ({})), headers: r.headers }; }
  post(path, body) { return this.json(path, { method: "POST", body: JSON.stringify(body) }); }
}
async function newAccount(tag) {
  const email = `nura.e2e.reg.${tag}.${rand}@example.com`, password = "E2eTest!" + rand, c = new Client();
  const reg = await (await fetch(`${B}/api/auth/mobile-register`, { method: "POST", headers: J, body: JSON.stringify({ name: tag, email, password }) })).json();
  const csrf = (await (await c.f("/api/auth/csrf")).json()).csrfToken;
  c.absorb(await fetch(`${B}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: c.cookie() }, body: new URLSearchParams({ csrfToken: csrf, email, password, json: "true" }) }));
  return { c, email, id: reg.user.id };
}
const adult = { name: "Asha", age: "35", gender: "Female", heightCm: "165", weightKg: "62", activityLevel: "Lightly active", primaryGoal: "Maintain", trainingFrequency: "2–3 / week" };
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, p) => (await db.query(sql, p)).rows;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const html = { accept: "text/html,application/xhtml+xml" };
const ua = (s) => ({ "user-agent": s });
let A, Bb;
try {
  // ── app-only gate ──
  const get = async (path, headers) => { const r = await rf(B + path, { redirect: "manual", headers }); return { r, t: await r.text() }; };
  let g = await get("/dashboard", { ...html, ...ua("Mozilla/5.0 Chrome/126 Mobile") });
  check("gate: a browser gets the download page", /Download for Android/.test(g.t) && /no-store/.test(g.r.headers.get("cache-control") || ""));
  g = await get("/dashboard", { ...html, ...ua("Mozilla/5.0 NuraApp/1.2.2") });
  check("gate: the app (user agent) is let through", !/Download for Android/.test(g.t));
  g = await get("/dashboard", { ...html, ...ua("Mozilla/5.0 Chrome/126"), cookie: "nura_app=1.2.2" });
  check("gate: the app (cookie, as sent by its service worker) is let through", !/Download for Android/.test(g.t));
  g = await get("/privacy", { ...html, ...ua("Mozilla/5.0 Chrome") }); check("gate: privacy page stays public", g.r.status === 200 && !/Download for Android/.test(g.t));
  // first-run flow: welcome screens → sign-in; returning signed-out people skip the welcome
  const appUa = { ...html, ...ua("Mozilla/5.0 (Linux; Android 11) NuraApp/1.2.4") };
  // /dashboard streams its redirect (200 + refresh) instead of a 3xx, so accept either form
  const wentTo = async (r) => (r.headers.get("location") || (await r.text()).match(/NEXT_REDIRECT;replace;([^;]+);/)?.[1] || "");
  let w = await rf(B + "/dashboard", { redirect: "manual", headers: appUa });
  const w1 = await wentTo(w);
  check("first open (signed out, never welcomed) → welcome screens", /\/onboarding$/.test(w1), w1);
  w = await rf(B + "/dashboard", { redirect: "manual", headers: { ...appUa, cookie: "nura_welcomed=1" } });
  const w2 = await wentTo(w);
  check("later opens (welcome already seen) → straight to sign-in", /\/auth\/login$/.test(w2), w2);
  w = await rf(B + "/", { redirect: "manual", headers: appUa });
  check("the root address also starts with the welcome screens", /\/onboarding$/.test(w.headers.get("location") || ""), w.headers.get("location"));
  const apk = await rf(B + "/nura.apk", { method: "HEAD" }); check("download: APK is served", apk.status === 200 && /android/.test(apk.headers.get("content-type") || ""), apk.headers.get("content-length"));
  const h = await rf(B + "/api/health"); check("health endpoint ok + never cached", h.status === 200 && /no-store/.test(h.headers.get("cache-control") || ""));
  const csp = (await rf(B + "/download")).headers.get("content-security-policy") || "";
  check("security: CSP no longer allows payment domains", csp.length > 0 && !/razorpay/i.test(csp));
  // ── auth ──
  for (const p of ["/api/activity", "/api/reminders", "/api/export", "/api/sync/device"]) check(`auth: ${p} requires sign-in`, (await rf(B + p)).status === 401);
  A = await newAccount("a"); Bb = await newAccount("b");
  await A.c.post("/api/setup/save", adult); await Bb.c.post("/api/setup/save", { ...adult, name: "Bhaskar" });
  // ── family + privacy ──
  const kid = (await A.c.post("/api/profiles", { name: "Kid Aarav", relation: "child" })).body.id;
  check("family: child profile created", !!kid);
  const op = (c, o) => c.post("/api/offline/sync", { op: { createdAt: Date.now(), eatenAt: Date.now() - 60000, attempts: 0, status: "pending", ...o } });
  const meal = (name) => ({ name, mealSession: "Lunch", totalCalories: 400, totalProtein: 20, totalFat: 10, totalCarbs: 50, totalFiber: 5 });
  let r = await op(A.c, { id: "reg-meal-0001", userId: A.id, kind: "meal_manual", meal: meal("Parent lunch") });
  check("offline sync: meal accepted", r.body.status === "ok", JSON.stringify(r.body));
  r = await op(A.c, { id: "reg-meal-0001", userId: A.id, kind: "meal_manual", meal: meal("Parent lunch") });
  check("offline sync: replay is idempotent", r.body.status === "duplicate");
  r = await op(Bb.c, { id: "reg-meal-0002", userId: A.id, kind: "meal_manual", meal: meal("HIJACK") });
  check("PRIVACY: another account can't write into my profile", r.http >= 400 && (await q(`select count(*)::int c from meals where summary='HIJACK'`))[0].c === 0, JSON.stringify(r.body));
  r = await op(A.c, { id: "reg-water-001", userId: kid, kind: "water_add", amountMl: 300 });
  check("child's water logged to the child", r.body.status === "ok" && (await q(`select count(*)::int c from water_logs where user_id=$1`, [kid]))[0].c === 1);
  check("sync: junk water amount rejected", (await op(A.c, { id: "reg-water-002", userId: A.id, kind: "water_add", amountMl: 99999 })).http === 400);
  // ── payments are switched off ──
  for (const p of ["/api/razorpay/order", "/api/razorpay/verify", "/api/payment/verify"]) check(`free: ${p} is disabled (410)`, (await A.c.post(p, {})).http === 410);
  // ── free-for-all ──
  check("free: nothing in the sync API mentions upgrade/limit for a brand-new account", !JSON.stringify((await op(A.c, { id: "reg-meal-0003", userId: A.id, kind: "meal_manual", meal: meal("Dinner") })).body).match(/upgrade|premium|limit/i));
  // ── activity + devices ──
  A.c.jar["nura_active"] = A.id;
  const pair = await A.c.post("/api/sync/pair", {});
  const dev = await (await rf(B + "/api/sync/device", { method: "POST", headers: J, body: JSON.stringify({ code: pair.body.code, label: "t" }) })).json();
  check("pairing: code → device token", /^nds_/.test(dev.token || ""));
  const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const imp = (tok, body) => rf(B + "/api/activity/import", { method: "POST", headers: { ...J, authorization: `Bearer ${tok}` }, body: JSON.stringify(body) }).then(async (x) => ({ http: x.status, body: await x.json().catch(() => ({})) }));
  const pay = { source: "health-connect", days: [{ day, steps: 8000, activeKcal: 300 }], workouts: [{ externalId: "w1", startedAt: new Date(Date.now() - 7200000).toISOString(), minutes: 40, kcal: 300, kind: "running" }], weights: [{ at: new Date(Date.now() - 3600000).toISOString(), kg: 61.2 }] };
  check("activity import ok", (await imp(dev.token, pay)).body.newWorkouts === 1);
  check("activity import idempotent", (await imp(dev.token, pay)).body.newWorkouts === 0);
  check("PRIVACY: other account sees none of my activity", ((await Bb.c.json("/api/activity")).body.days ?? []).length === 0);
  const list = await A.c.json("/api/sync/device");
  await A.c.json("/api/sync/device", { method: "DELETE", body: JSON.stringify({ id: list.body.devices[0].id }) });
  check("revoked device token stops working immediately", (await imp(dev.token, pay)).http === 401);
  // app link + reminders
  Bb.c.jar["nura_active"] = Bb.id; // reminder checks use the account that has not just eaten (Nura never nags right after a meal)
  const pair2 = await Bb.c.post("/api/sync/pair", {});
  const app = await (await rf(B + "/api/sync/device", { method: "POST", headers: J, body: JSON.stringify({ code: pair2.body.code, label: "phone", purpose: "app" }) })).json();
  const hhmm = new Date(Date.now() + 5.5 * 3600_000 - 60_000).toISOString().slice(11, 16);
  await Bb.c.json("/api/reminders", { method: "PUT", body: JSON.stringify({ enabled: true, timezone: "Asia/Kolkata", settings: { meals: { lunch: hhmm, breakfast: null, snack: null, dinner: null }, water: { enabled: false }, weighIn: { enabled: false } } }) });
  const due = (t) => rf(B + "/api/device/due", { headers: { authorization: `Bearer ${t}` } }).then(async (x) => ({ http: x.status, body: await x.json().catch(() => ({})) }));
  check("reminders: due reminder reaches the app once", (await due(app.token)).body.reminders?.length === 1);
  check("reminders: second poll is empty", (await due(app.token)).body.reminders?.length === 0);
  const sched = await rf(B + "/api/device/schedule", { headers: { authorization: `Bearer ${app.token}` } }).then(async (x) => ({ http: x.status, body: await x.json().catch(() => ({})) }));
  check("alarms: the app gets its wake-up schedule (future times only)", sched.http === 200 && Array.isArray(sched.body.times) && sched.body.times.length >= 1 && sched.body.times.every((t) => t > Date.now() - 5000), JSON.stringify(sched.body.times?.slice(0, 2)));
  check("alarms: schedule needs a paired device", (await rf(B + "/api/device/schedule")).status === 401);
  await rf(B + "/api/device/unlink", { method: "POST", headers: { authorization: `Bearer ${app.token}` } });
  check("reminders: after sign-out the token is dead", (await due(app.token)).http === 401);
  // grocery
  r = await op(A.c, { id: "reg-groc-0001", userId: A.id, kind: "grocery_add", groceryItems: ["Paneer (200 g)", "paneer (200 g)", "Spinach"] });
  check("grocery: offline add dedupes (case-insensitive)", r.body.status === "ok" && (await q(`select count(*)::int c from grocery_list where user_id=$1`, [A.id]))[0].c === 2);
  // feedback channel
  check("feedback: signed-out is refused", (await rf(B + "/api/feedback", { method: "POST", headers: J, body: JSON.stringify({ message: "hello there" }) })).status === 401);
  check("feedback: too-short message refused", (await A.c.post("/api/feedback", { message: "x" })).http === 400);
  const fb = await A.c.post("/api/feedback", { category: "bug", message: "Regression test feedback \u0000 with a hidden character", screen: "/dashboard" });
  const fbRow = (await q(`select category, message from feedback where user_id=$1`, [A.id]))[0];
  check("feedback: saved with its category, hidden characters removed", fb.http === 200 && fbRow?.category === "bug" && !fbRow.message.includes("\u0000"));
  // export privacy
  const ex = await rf(B + "/api/export?format=json", { headers: { cookie: A.c.cookie() } });
  const exTxt = await ex.text(); const pw = (await q(`select password from "user" where id=$1`, [A.id]))[0].password;
  check("export: 200, no-store, contains my data but never my password hash", ex.status === 200 && /Parent lunch/.test(exTxt) && !exTxt.includes(pw) && !/HIJACK/.test(exTxt));
} finally {
  const ids = (await q(`select id from "user" where email like $1`, [`nura.e2e.reg.%.${rand}@example.com`])).map((r) => r.id);
  await q(`delete from "user" where parent_id = any($1) or id = any($1)`, [ids]);
  await q(`delete from feedback where message like 'Regression test feedback%'`);
  console.log(`\n${results.filter(Boolean).length}/${results.length} passed; leftovers: ${(await q(`select count(*)::int c from "user" where email like $1`, [`%.${rand}@example.com`]))[0].c}`);
  await db.end();
}
