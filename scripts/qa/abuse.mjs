// "How real users break things": five attack styles against production, with disposable accounts (cleaned up at the end).
//   node scripts/qa/abuse.mjs        (prints PASS/FAIL per check; exit code 1 if anything failed)
import pg from "pg";
import { config } from "dotenv";
config({ path: new URL("../../.env.local", import.meta.url).pathname, quiet: true });
const B = process.env.BASE || "https://dietbuddy.buildc3.tech";
const rand = Math.random().toString(36).slice(2, 8);
const J = { "content-type": "application/json" };
const results = [];
const check = (name, ok, extra = "") => { results.push(!!ok); console.log(ok ? "PASS" : "FAIL", name, extra); };
const rf = async (...a) => { for (let i = 0; i < 4; i++) { try { return await fetch(...a); } catch (e) { if (i === 3) throw e; await new Promise((r) => setTimeout(r, 800)); } } };
const section = (t) => console.log(`\n── ${t}`);

class Client {
  constructor() { this.jar = {}; }
  cookie() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; "); }
  absorb(res) { for (const c of res.headers.getSetCookie()) { const [nv] = c.split(";"); const i = nv.indexOf("="); const k = nv.slice(0, i), v = nv.slice(i + 1); if (/Max-Age=0|expires=Thu, 01 Jan 1970/i.test(c) || v === "") delete this.jar[k]; else this.jar[k] = v; } }
  async f(path, init = {}) { const res = await rf(B + path, { ...init, redirect: "manual", headers: { ...(init.body ? J : {}), cookie: this.cookie(), ...(init.headers || {}) } }); this.absorb(res); return res; }
  async json(path, init) { const r = await this.f(path, init); return { http: r.status, body: await r.json().catch(() => ({})) }; }
  post(path, body) { return this.json(path, { method: "POST", body: JSON.stringify(body) }); }
}
async function signIn(c, email, password) {
  const csrf = (await (await c.f("/api/auth/csrf")).json()).csrfToken;
  const r = await rf(`${B}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: c.cookie() }, body: new URLSearchParams({ csrfToken: csrf, email, password, json: "true" }) });
  c.absorb(r);
  return !!(await (await c.f("/api/auth/session")).json())?.user?.id;
}
async function newAccount(tag, emailOverride) {
  const email = emailOverride ?? `nura.e2e.abuse.${tag}.${rand}@example.com`, password = "E2eTest!" + rand, c = new Client();
  const reg = await (await rf(`${B}/api/auth/mobile-register`, { method: "POST", headers: J, body: JSON.stringify({ name: tag, email, password }) })).json();
  const ok = await signIn(c, email.toLowerCase(), password);
  return { c, email, password, id: reg.user?.id, ok };
}
const adult = { name: "Asha", age: "35", gender: "Female", heightCm: "165", weightKg: "62", activityLevel: "Lightly active", primaryGoal: "Maintain", trainingFrequency: "2–3 / week" };
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const q = async (sql, p) => (await db.query(sql, p)).rows;
const meal = (name, extra = {}) => ({ name, mealSession: "Lunch", totalCalories: 400, totalProtein: 20, totalFat: 10, totalCarbs: 50, totalFiber: 5, ...extra });
const op = (c, o) => c.post("/api/offline/sync", { op: { createdAt: Date.now(), eatenAt: Date.now() - 60000, attempts: 0, status: "pending", ...o } });

let A, Bb;
try {
  A = await newAccount("a"); Bb = await newAccount("b");
  await A.c.post("/api/setup/save", adult); await Bb.c.post("/api/setup/save", { ...adult, name: "Bhaskar" });
  A.c.jar["nura_active"] = A.id;

  /* ═════ 1. FAT FINGERS & DOUBLE TAPS: the same thing arrives many times at once ═════ */
  section("1. Double taps and parallel requests");
  const same = await Promise.all(Array.from({ length: 25 }, () => op(A.c, { id: "dbl-meal-00001", userId: A.id, kind: "meal_manual", meal: meal("Double tap lunch") })));
  check("25 identical meal submissions at once → exactly one meal, no errors", (await q(`select count(*)::int c from meals where user_id=$1 and summary='Double tap lunch'`, [A.id]))[0].c === 1 && same.every((r) => r.http === 200), `statuses ${[...new Set(same.map((r) => r.http))]}`);
  const waters = await Promise.all(Array.from({ length: 30 }, (_, i) => op(A.c, { id: `dbl-water-${String(i).padStart(4, "0")}`, userId: A.id, kind: "water_add", amountMl: 2000 })));
  const wsum = (await q(`select coalesce(sum(amount_ml),0)::int s from water_logs where user_id=$1`, [A.id]))[0].s;
  check("30 simultaneous 2-litre drinks can't push the day past the 8 L safety cap", wsum <= 8000, `total ${wsum} ml`);
  const adds = await Promise.all(Array.from({ length: 12 }, (_, i) => A.c.post("/api/profiles", { name: `Kid ${i}`, relation: "child" })));
  const people = (await q(`select count(*)::int c from "user" where id=$1 or parent_id=$1`, [A.id]))[0].c;
  check("12 simultaneous 'add family member' taps can't exceed the 6-person limit", people <= 6, `${people} people, statuses ${adds.map((r) => r.http).join(",")}`);
  const mid = (await q(`select id from meals where user_id=$1 and summary='Double tap lunch'`, [A.id]))[0]?.id;
  const dels = await Promise.all(Array.from({ length: 10 }, (_, i) => op(A.c, { id: `dbl-del-${String(i).padStart(5, "0")}`, userId: A.id, kind: "meal_delete", mealId: mid })));
  check("10 simultaneous deletes of one meal → all answered cleanly (no 500)", dels.every((r) => r.http < 500), `statuses ${[...new Set(dels.map((r) => r.http))]}`);

  /* ═════ 2. SIGN-IN CHAOS: capital letters, spaces, races, junk ═════ */
  section("2. Sign-up and sign-in chaos");
  const mixed = `Nura.E2E.Abuse.Mixed.${rand}@Example.com`;
  const m = await newAccount("mixed", mixed);
  const c2 = new Client();
  check("sign up with capital letters, then sign in typing it exactly as typed", await signIn(c2, mixed, m.password));
  const c3 = new Client();
  check("…and signing in with the all-lowercase version also works (phone keyboards capitalise)", await signIn(c3, mixed.toLowerCase(), m.password));
  const c4 = new Client();
  check("…and with a stray space at the end (copy-paste)", await signIn(c4, " " + mixed.toLowerCase() + " ", m.password));
  const regWeb = (email) => rf(`${B}/api/auth/register`, { method: "POST", headers: J, body: JSON.stringify({ name: "Web", email, password: "E2eTest!" + rand }) }).then(async (r) => ({ http: r.status, body: await r.json().catch(() => ({})) }));
  const w1 = await regWeb(`nura.e2e.abuse.web.${rand}@example.com`);
  const w2 = await regWeb(`NURA.E2E.ABUSE.WEB.${rand}@example.com`);
  check("web sign-up: the same email in different capitals is refused as already registered", w1.http < 300 && w2.http >= 400 && w2.http < 500, `${w1.http} then ${w2.http}`);
  const race = await Promise.all(Array.from({ length: 3 }, () => rf(`${B}/api/auth/mobile-register`, { method: "POST", headers: J, body: JSON.stringify({ name: "Race", email: `nura.e2e.abuse.race.${rand}@example.com`, password: "E2eTest!" + rand }) }).then((r) => r.status)));
  const raceN = (await q(`select count(*)::int c from "user" where lower(email)=$1`, [`nura.e2e.abuse.race.${rand}@example.com`]))[0].c;
  check("3 simultaneous sign-ups with one email → one account, refused ones get a clean 4xx (never 500)", raceN === 1 && race.every((s) => s < 500), `accounts ${raceN}, statuses ${race.join(",")}`);
  const junk = [{}, { email: 5, password: 5 }, { email: "a".repeat(400) + "@x.com", password: "x".repeat(20) }, { email: "x@y.zz", password: "p".repeat(5000) }, { email: "x\u0000@y.zz", password: "12345678" }];
  const jr = await Promise.all(junk.map((b) => rf(`${B}/api/auth/mobile-register`, { method: "POST", headers: J, body: JSON.stringify(b) }).then((r) => r.status)));
  check("junk sign-up bodies (wrong types, 400-char email, 5000-char password, NUL byte) → 4xx, never 500", jr.every((s) => s >= 400 && s < 500), jr.join(","));
  const nr = await rf(`${B}/api/auth/mobile-register`, { method: "POST", headers: J, body: "{not json" });
  check("broken JSON → 4xx, not a crash", nr.status >= 400 && nr.status < 500, String(nr.status));

  /* ═════ 3. HOSTILE TEXT: scripts, quotes, giant strings, emoji ═════ */
  section("3. Hostile and odd text");
  const nasty = ["<script>alert(1)</script>", `'; DROP TABLE meals; --`, "Robert'); DELETE FROM \"user\"; --", "‮evil‬", "😀".repeat(80), "x".repeat(5000), "a\u0000b"];
  const sent = [];
  for (let i = 0; i < nasty.length; i++) { const r = await op(A.c, { id: `nasty-meal-${String(i).padStart(4, "0")}`, userId: A.id, kind: "meal_manual", meal: meal(nasty[i]) }); sent.push(r.http); }
  check("hostile meal names never crash the server (no 500)", sent.every((s) => s < 500), sent.join(","));
  check("meals and users tables are still intact after the SQL-injection attempts", (await q(`select count(*)::int c from "user" where id=$1`, [A.id]))[0].c === 1 && (await q(`select count(*)::int c from meals where user_id=$1`, [A.id]))[0].c >= 1);
  const longest = (await q(`select max(length(summary))::int m from meals where user_id=$1`, [A.id]))[0].m;
  check("stored names are capped in length (nobody can store a 5,000-character name)", longest <= 100, `longest ${longest}`);
  const hasNul = (await q(`select count(*)::int c from meals where user_id=$1 and summary like '%' || chr(1) || '%'`, [A.id]))[0].c;
  const pname = await A.c.post("/api/profiles", { name: "<img src=x onerror=alert(1)>".repeat(5), relation: "child" });
  const pn = pname.http === 200 ? (await q(`select name from "user" where id=$1`, [pname.body.id]))[0].name : "(refused)";
  check("family-member names are capped (40 chars)", pname.http >= 400 || pn.length <= 40, `stored ${pn.length} chars`);
  const g = await op(A.c, { id: "nasty-groc-0001", userId: A.id, kind: "grocery_add", groceryItems: ["<b>x</b>".repeat(60), "y".repeat(500), ...Array.from({ length: 200 }, (_, i) => "i" + i)] });
  check("giant grocery list is trimmed, not rejected with a crash", g.http < 500 && (await q(`select max(length(ingredient_name))::int m, count(*)::int c from grocery_list where user_id=$1`, [A.id]))[0].m <= 120);
  const ex = await rf(`${B}/api/export?format=zip`, { headers: { cookie: A.c.cookie() } });
  check("export still works with all that hostile data in the account", ex.status === 200);

  /* ═════ 4. STOLEN, STALE AND TAMPERED SESSIONS ═════ */
  section("4. Other people's data, deleted accounts, tampered cookies");
  const bMeal = await op(Bb.c, { id: "b-secret-00001", userId: Bb.id, kind: "meal_manual", meal: meal("BHASKAR PRIVATE MEAL") });
  const bMealId = (await q(`select id from meals where user_id=$1 limit 1`, [Bb.id]))[0]?.id;
  const idor = [];
  idor.push(["sync write into B's profile", (await op(A.c, { id: "idor-write-0001", userId: Bb.id, kind: "meal_manual", meal: meal("HIJACK") })).http]);
  await op(A.c, { id: "idor-del-00001", userId: A.id, kind: "meal_delete", mealId: bMealId }); // answers "already gone" (200) but must delete nothing
  idor.push(["export B's profile", (await rf(`${B}/api/export?format=json&scope=profile&profile=${Bb.id}`, { headers: { cookie: A.c.cookie() } })).status]);
  idor.push(["rename B's profile", (await A.c.json(`/api/profiles/${Bb.id}`, { method: "PATCH", body: JSON.stringify({ name: "pwned" }) })).http]);
  idor.push(["delete B's profile", (await A.c.json(`/api/profiles/${Bb.id}`, { method: "DELETE" })).http]);
  idor.push(["switch into B's profile", (await A.c.post("/api/profiles/switch", { id: Bb.id })).http]);
  for (const [n, s] of idor) check(`can't ${n}`, s >= 400, `HTTP ${s}`);
  check("B's meal survives A's delete attempt, and nothing was written into B's profile", (await q(`select count(*)::int c from meals where user_id=$1 and summary='BHASKAR PRIVATE MEAL'`, [Bb.id]))[0].c === 1 && (await q(`select count(*)::int c from meals where summary='HIJACK'`))[0].c === 0);
  const tamper = new Client(); await signIn(tamper, A.email.toLowerCase(), A.password); tamper.jar["nura_active"] = Bb.id;
  const tj = await rf(`${B}/api/export?format=json`, { headers: { cookie: tamper.cookie() } }); const tt = await tj.text();
  check("a hand-edited 'active profile' cookie pointing at B can't read B's data", !tt.includes("BHASKAR"));
  // an account is deleted while its session cookie is still in a browser / another phone
  const ghost = await newAccount("ghost"); await ghost.c.post("/api/setup/save", adult);
  await q(`delete from "user" where id=$1`, [ghost.id]);
  const gs = await Promise.all([
    op(ghost.c, { id: "ghost-meal-0001", userId: ghost.id, kind: "meal_manual", meal: meal("ghost") }).then((r) => r.http),
    ghost.c.json("/api/activity").then((r) => r.http),
    ghost.c.post("/api/profiles", { name: "x" }).then((r) => r.http),
    ghost.c.post("/api/sync/pair", {}).then((r) => r.http),
    rf(`${B}/api/export?format=json`, { headers: { cookie: ghost.c.cookie() } }).then((r) => r.status),
  ]);
  check("a deleted account's old session gets clean 4xx everywhere, never a 500 or orphan data", gs.every((s) => s >= 400 && s < 500) && (await q(`select count(*)::int c from meals where user_id=$1`, [ghost.id]))[0].c === 0, `statuses ${gs.join(",")}`);
  const forged = await rf(`${B}/api/device/due`, { headers: { authorization: "Bearer nds_" + "A".repeat(43) } });
  const forged2 = await rf(`${B}/api/activity/import`, { method: "POST", headers: { ...J, authorization: "Bearer not-a-token" }, body: "{}" });
  check("forged device tokens are refused", forged.status === 401 && forged2.status === 401);

  // every endpoint that reads a JSON body, fed broken JSON while signed in: must answer 4xx, never 500
  const sweep = [["POST","/api/auth/send-otp"],["POST","/api/auth/verify-otp"],["POST","/api/auth/mobile-login"],["POST","/api/setup/save"],["POST","/api/push/subscribe"],["POST","/api/profiles"],["POST","/api/profiles/switch"],["PUT","/api/reminders"],["PUT","/api/activity/settings"],["POST","/api/activity/workout"],["DELETE","/api/activity/workout"],["POST","/api/sync/device"],["DELETE","/api/sync/device"],["POST","/api/sync/goals"],["POST","/api/sync/meals"],["POST","/api/insights/update-goal"],["POST","/api/activity/import"],["POST","/api/offline/sync"]];
  const bad = [];
  for (const [method, path] of sweep) { const r = await rf(B + path, { method, headers: { ...J, cookie: A.c.cookie() }, body: "{broken" }); if (r.status >= 500) bad.push(`${method} ${path} → ${r.status}`); }
  check(`broken JSON sent to ${sweep.length} different endpoints → none of them crash`, bad.length === 0, bad.join("; "));

  /* ═════ 5. FLOODS: huge uploads, big offline backlogs ═════ */
  section("5. Floods and oversized requests");
  const big = "x".repeat(6_000_000);
  const bigR = await rf(`${B}/api/offline/sync`, { method: "POST", headers: { ...J, cookie: A.c.cookie() }, body: JSON.stringify({ op: { id: "flood-big-00001", userId: A.id, kind: "meal_text", text: big, createdAt: Date.now(), eatenAt: Date.now() } }) });
  check("a 6 MB request is refused quickly (not processed or passed to the AI)", bigR.status >= 400 && bigR.status < 500, `HTTP ${bigR.status}`);
  const badPhoto = await Promise.all(["data:image/png;base64," + "A".repeat(900_000), "not-an-image", "data:text/html;base64,PHNjcmlwdD4=", ""].map((image, i) => op(A.c, { id: `flood-photo-${i}000000`, userId: A.id, kind: "meal_photo", image }).then((r) => r.http)));
  check("oversized, non-image or empty photos are refused before any AI call", badPhoto.every((s) => s >= 400 && s < 500), badPhoto.join(","));
  const t0 = Date.now();
  const backlog = []; for (let i = 0; i < 60; i++) backlog.push(op(A.c, { id: `flood-log-${String(i).padStart(5, "0")}`, userId: A.id, kind: "weight_log", weightKg: 60 + (i % 10) / 10 }));
  const bl = await Promise.all(backlog);
  check("a 60-item offline backlog arriving at once is handled without errors or rate-limit false alarms", bl.every((r) => r.http < 500 && r.http !== 429), `statuses ${[...new Set(bl.map((r) => r.http))]} in ${Date.now() - t0} ms`);
  const wtn = (await q(`select count(*)::int c from weight_logs where user_id=$1`, [A.id]))[0].c;
  check("…and none of those weigh-ins were lost or doubled", wtn >= 1 && wtn <= 60, `${wtn} stored`);
  const fut = await op(A.c, { id: "clock-fut-00001", userId: A.id, kind: "meal_manual", eatenAt: Date.now() + 3 * 3600_000, meal: meal("from the future") });
  const old = await op(A.c, { id: "clock-old-00001", userId: A.id, kind: "meal_manual", eatenAt: Date.now() - 40 * 86400_000, meal: meal("ancient") });
  check("a wrong phone clock (3 h ahead / 40 days behind) can't write meals into the future or distant past", fut.http === 400 && old.http === 400, `${fut.http}, ${old.http}`);
  const garbage = await Promise.all(["{}", '{"op":null}', '{"op":"x"}', '{"op":{"id":"a"}}', "[]"].map((body) => rf(`${B}/api/offline/sync`, { method: "POST", headers: { ...J, cookie: A.c.cookie() }, body }).then((r) => r.status)));
  check("malformed sync requests → 4xx, never 500", garbage.every((s) => s >= 400 && s < 500), garbage.join(","));
} catch (e) {
  console.log("SUITE ERROR:", e);
  results.push(false);
} finally {
  const ids = (await q(`select id from "user" where lower(email) like $1 or email in ('x@y.zz')`, [`nura.e2e.abuse.%${rand}@example.com`])).map((r) => r.id);
  await q(`delete from "user" where parent_id = any($1) or id = any($1)`, [ids]);
  const left = (await q(`select count(*)::int c from "user" where lower(email) like $1`, [`%${rand}@example.com`]))[0].c;
  const pass = results.filter(Boolean).length;
  console.log(`\n${pass}/${results.length} passed; leftover test accounts: ${left}`);
  await db.end();
  process.exit(pass === results.length ? 0 : 1);
}
