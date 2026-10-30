// Keeps the app's server function warm so the first screen after a quiet spell isn't a multi-second cold start.
// Uses the lite health check on purpose: it must NOT query the database, or the database never sleeps and burns its quota.
import type { Config } from "@netlify/functions";

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!base) return;
  const t = Date.now();
  const res = await fetch(`${base}/api/health?lite=1`, { headers: { "cache-control": "no-cache" } }).catch(() => null);
  console.log("warm:", res?.status ?? "failed", `${Date.now() - t}ms`);
};

export const config: Config = { schedule: "*/4 * * * *" };
