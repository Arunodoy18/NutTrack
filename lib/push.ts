import webpush from "web-push";

/** Push is available only when the three VAPID variables are present (set in Netlify / .env.local). */
export function pushConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "mailto:support@nura.app";
  return { publicKey, privateKey, subject, configured: !!publicKey && !!privateKey };
}

let initialised = false;
function init() {
  const c = pushConfig();
  if (!c.configured) return false;
  if (!initialised) {
    webpush.setVapidDetails(c.subject, c.publicKey, c.privateKey);
    initialised = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface StoredSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Returns "ok", "gone" (subscription expired — delete it) or "error". */
export async function sendPush(sub: StoredSub, payload: PushPayload): Promise<"ok" | "gone" | "error"> {
  if (!init()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 2, urgency: "normal" } // a stale "lunch time" at 4 PM is worse than none
    );
    return "ok";
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.statusCode === 410) return "gone";
    console.error("[push] send failed:", err?.statusCode, err?.body?.slice?.(0, 120) ?? err?.message);
    return "error";
  }
}
