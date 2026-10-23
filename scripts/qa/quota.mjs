// Spends the free daily AI allowance on a throwaway account (11 small AI calls) and checks the 11th is refused,
// while everything that is NOT an AI scan keeps working.   node scripts/qa/quota.mjs
import pg from "pg";
import { config } from "dotenv";
config({ path: new URL("../../.env.local", import.meta.url).pathname, quiet: true });
const B = process.env.BASE || "https://dietbuddy.buildc3.tech";
const rand = Math.random().toString(36).slice(2, 8), J = { "content-type": "application/json" };
const results = []; const check = (n, ok, x = "") => { results.push(!!ok); console.log(ok ? "PASS" : "FAIL", n, x); };
const jar = {}; const abs = (r) => { for (const c of r.headers.getSetCookie()) { const [nv] = c.split(";"); const i = nv.indexOf("="); jar[nv.slice(0, i)] = nv.slice(i + 1); } };
const ck = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
const rfetch = async (...a) => { for (let i = 0; i < 5; i++) { try { return await fetch(...a); } catch (e) { if (i === 4) throw e; await new Promise((r) => setTimeout(r, 1500)); } } }; // my own network can blip; ops are idempotent so a retry is safe
const call = async (path, init = {}) => { const r = await rfetch(B + path, { ...init, headers: { ...(init.body ? J : {}), cookie: ck(), ...(init.headers || {}) } }); abs(r); return { http: r.status, body: await r.json().catch(() => ({})) }; };
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const email = `nura.e2e.quota.${rand}@example.com`, password = "E2eTest!" + rand;
try {
  const reg = await (await fetch(`${B}/api/auth/mobile-register`, { method: "POST", headers: J, body: JSON.stringify({ name: "Quota", email, password }) })).json();
  const csrf = (await (await call("/api/auth/csrf")).body).csrfToken;
  const lr = await fetch(`${B}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: ck() }, body: new URLSearchParams({ csrfToken: csrf, email, password, json: "true" }) }); abs(lr);
  await call("/api/setup/save", { method: "POST", body: JSON.stringify({ name: "Quota", age: "30", gender: "Male", heightCm: "175", weightKg: "70", activityLevel: "Moderately active", primaryGoal: "Maintain", trainingFrequency: "2–3 / week" }) });
  jar["nura_tz"] = "Asia/Kolkata";
  const uid = reg.user.id;
  const left = async () => (await call("/api/scans")).body;
  let q = await left();
  check("a new account starts with the full free allowance (10)", q.limit === 10 && q.remaining === 10, JSON.stringify(q));
  const text = ["2 rotis with dal", "a banana", "bowl of curd", "plain dosa", "boiled egg", "apple", "glass of milk", "poha", "idli sambar", "paneer sandwich", "one samosa"];
  const statuses = [];
  for (let i = 0; i < text.length; i++) {
    const r = await call("/api/offline/sync", { method: "POST", body: JSON.stringify({ op: { id: `quota-text-${String(i).padStart(4, "0")}`, userId: uid, kind: "meal_text", text: text[i], createdAt: Date.now(), eatenAt: Date.now() - 60000, attempts: 0, status: "pending" } }) });
    statuses.push(r.body.status ?? r.http);
    if (i === 2) { q = await left(); check("the counter goes down as scans are used (3 used → 7 left)", q.remaining === 7, JSON.stringify(q)); }
  }
  console.log("   statuses:", statuses.join(" "));
  const okCount = statuses.filter((s) => s === "ok" || s === "duplicate").length;
  check("exactly 10 AI scans succeed", okCount === 10, `${okCount} ok`);
  check("the 11th is refused (kept for retry tomorrow, not lost)", statuses[10] === "retry", String(statuses[10]));
  q = await left();
  check("the counter reads 0 left and never goes negative", q.remaining === 0 && q.used === 10, JSON.stringify(q));
  const manual = await call("/api/offline/sync", { method: "POST", body: JSON.stringify({ op: { id: "quota-manual-0001", userId: uid, kind: "meal_manual", createdAt: Date.now(), eatenAt: Date.now() - 60000, attempts: 0, status: "pending", meal: { name: "Manual lunch", mealSession: "Lunch", totalCalories: 300, totalProtein: 10, totalFat: 10, totalCarbs: 40, totalFiber: 3 } } }) });
  const water = await call("/api/offline/sync", { method: "POST", body: JSON.stringify({ op: { id: "quota-water-00001", userId: uid, kind: "water_add", amountMl: 250, createdAt: Date.now(), eatenAt: Date.now() - 1000, attempts: 0, status: "pending" } }) });
  const foods = await call("/api/foods/search?q=paneer");
  check("after the cap: manual meals, water and food search still work", manual.body.status === "ok" && water.body.status === "ok" && foods.http === 200, `${manual.body.status}/${water.body.status}/${foods.http}`);
  const fam = await call("/api/profiles", { method: "POST", body: JSON.stringify({ name: "Kid", relation: "child" }) });
  const kidSync = await call("/api/offline/sync", { method: "POST", body: JSON.stringify({ op: { id: "quota-text-kid-001", userId: fam.body.id, kind: "meal_text", text: "a banana", createdAt: Date.now(), eatenAt: Date.now() - 60000, attempts: 0, status: "pending" } }) });
  check("adding a family member does NOT give extra scans (allowance belongs to the account)", kidSync.body.status === "retry", String(kidSync.body.status));
  const interest = await call("/api/feedback", { method: "POST", body: JSON.stringify({ category: "premium", message: "Wants to be told when Premium launches" }) });
  check("'tell me when Premium is ready' is recorded", interest.http === 200 && (await db.query(`select count(*)::int c from feedback where user_id=$1 and category='premium'`, [uid])).rows[0].c === 1);
} catch (e) { console.log("SUITE ERROR", e); results.push(false); }
finally {
  const ids = (await db.query(`select id from "user" where email=$1`, [email])).rows.map((r) => r.id);
  await db.query(`delete from "user" where parent_id = any($1) or id = any($1)`, [ids]);
  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  await db.end(); process.exit(results.every(Boolean) ? 0 : 1);
}
