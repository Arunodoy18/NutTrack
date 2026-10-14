// Creates a disposable user with a completed profile and prints {email, token, cookies:[{name,value}]}.
// Usage: node scripts/qa/mkuser.mjs [name] [age] > user.json     (delete it afterwards with scripts/qa/cleanup.mjs)
const B = process.env.BASE || "https://dietbuddy.buildc3.tech";
const name = process.argv[2] || "QA Dev", age = process.argv[3] || "30";
const rand = Math.random().toString(36).slice(2, 8), pass = "E2eTest!" + rand, email = `nura.qa.dev.${rand}@example.com`;
let r = await fetch(`${B}/api/auth/mobile-register`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, password: pass }) });
const reg = await r.json();
r = await fetch(`${B}/api/auth/csrf`); const csrf = (await r.json()).csrfToken;
const jar = r.headers.getSetCookie().map((c) => c.split(";")[0]);
r = await fetch(`${B}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.join("; ") }, body: new URLSearchParams({ csrfToken: csrf, email, password: pass, json: "true" }) });
const set = r.headers.getSetCookie().map((c) => { const [nv] = c.split(";"); const i = nv.indexOf("="); return { name: nv.slice(0, i), value: nv.slice(i + 1) }; });
const cookie = [...jar, ...set.map((c) => `${c.name}=${c.value}`)].join("; ");
const s = await fetch(`${B}/api/setup/save`, { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ name, age, gender: "Male", heightCm: "175", weightKg: "70", activityLevel: "Moderately active", primaryGoal: "Maintain", trainingFrequency: "2–3 / week" }) });
console.log(JSON.stringify({ email, token: reg.token, setup: s.status, cookies: set }));
