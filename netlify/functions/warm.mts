// Keeps the app's server function warm so the first screen after a quiet spell isn't a multi-second cold start.
import type { Config } from "@netlify/functions";

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!base) return;
  const t = Date.now();
  const res = await fetch(`${base}/api/health`, { headers: { "cache-control": "no-cache" } }).catch(() => null);
  console.log("warm:", res?.status ?? "failed", `${Date.now() - t}ms`);
};

export const config: Config = { schedule: "*/4 * * * *" };
