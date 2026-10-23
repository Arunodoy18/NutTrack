import { redis } from "@/lib/rateLimit";
import { dateKeyInTz } from "@/lib/tz";
import { FREE_DAILY_AI_SCANS, PREMIUM_COMING_SOON } from "@/lib/plan";

/**
 * Daily AI-scan allowance per ACCOUNT (family members share it, so adding people can't multiply it).
 * The day is the person's own local day, so it resets at their midnight. Counted in Redis; if Redis is
 * unreachable the limit is not enforced (never block someone because of our infrastructure).
 */
export const scanKey = (ownerId: string, tz: string, now = new Date()) => `dietbuddy:aiscans:${ownerId}:${dateKeyInTz(tz, now)}`;

export const limitMessage = (limit = FREE_DAILY_AI_SCANS) =>
  `You've used today's ${limit} free AI scans. They reset at midnight. ${PREMIUM_COMING_SOON} You can still log with search, barcode or manual entry.`;

export interface Quota { allowed: boolean; used: number; limit: number; remaining: number }

export async function consumeScan(ownerId: string, tz: string, limit = FREE_DAILY_AI_SCANS): Promise<Quota> {
  if (!redis) return { allowed: true, used: 0, limit, remaining: limit };
  try {
    const key = scanKey(ownerId, tz);
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 36 * 3600);
    if (n > limit) { await redis.decr(key); return { allowed: false, used: limit, limit, remaining: 0 }; }
    return { allowed: true, used: n, limit, remaining: limit - n };
  } catch (e) {
    console.error("[scanQuota] unavailable, allowing:", (e as Error).message);
    return { allowed: true, used: 0, limit, remaining: limit };
  }
}

export async function refundScan(ownerId: string, tz: string): Promise<void> {
  if (!redis) return;
  try {
    const key = scanKey(ownerId, tz);
    const n = Number(await redis.get(key)) || 0;
    if (n > 0) await redis.decr(key);
  } catch { /* nothing to give back */ }
}

export async function peekScans(ownerId: string, tz: string, limit = FREE_DAILY_AI_SCANS): Promise<Quota> {
  if (!redis) return { allowed: true, used: 0, limit, remaining: limit };
  try {
    const n = Math.min(limit, Number(await redis.get(scanKey(ownerId, tz))) || 0);
    return { allowed: n < limit, used: n, limit, remaining: limit - n };
  } catch { return { allowed: true, used: 0, limit, remaining: limit }; }
}
