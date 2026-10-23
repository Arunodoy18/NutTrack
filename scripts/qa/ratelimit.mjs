// Proves the Upstash-backed rate limiter is live: a burst of wrong pairing codes must start getting refused (HTTP 429).
// Uses only the public endpoint; no account needed.  node scripts/qa/ratelimit.mjs
const B = process.env.BASE || "https://dietbuddy.buildc3.tech";
const codes = [];
for (let i = 0; i < 16; i++) {
  const r = await fetch(`${B}/api/sync/device`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "ZZZZ" + String(1000 + i) }) });
  codes.push(r.status);
}
console.log("statuses:", codes.join(" "));
const blocked = codes.includes(429);
console.log(blocked ? `PASS rate limiting is ON: refused after ${codes.indexOf(429)} attempts` : "FAIL no 429 seen: the limiter is still failing open (check the Netlify env vars and redeploy)");
process.exit(blocked ? 0 : 1);
