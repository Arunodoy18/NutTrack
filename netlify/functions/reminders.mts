// Runs hourly on Netlify and asks the app to send any WEB-push reminders that are due. The Android app schedules its own
// reminders natively, so this job is not needed for it; running it often kept the database awake and burned its free quota.
// Needs CRON_SECRET (same value in the app) and uses Netlify's built-in URL variable.
import type { Config } from "@netlify/functions";

export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("reminders: URL or CRON_SECRET missing — skipping");
    return;
  }
  const res = await fetch(`${base}/api/push/cron`, { headers: { authorization: `Bearer ${secret}` } });
  console.log("reminders run:", res.status, (await res.text()).slice(0, 300));
};

export const config: Config = { schedule: "0 * * * *" };
