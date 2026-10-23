import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only initialize if environment variables are present, otherwise provide mock/fallback behavior
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) 
  ? Redis.fromEnv() 
  : null;

// Only instantiate limiters if redis is available
export const scanRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"), // 5 scans per hour (free)
  prefix: "dietbuddy:scan",
}) : null;

export const premiumScanRateLimit = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 d"), // 200/day premium
  prefix: "dietbuddy:scan:premium",
}) : null;

export async function checkScanRateLimit(userId: string, isPremium = false) {
  const limiter = isPremium ? premiumScanRateLimit : scanRateLimit;
  
  if (!limiter) {
    // Fallback if Redis is not configured: allow all requests
    return { allowed: true, remaining: 999 };
  }
  
  try {
    const { success, remaining } = await limiter.limit(userId);
    return { allowed: success, remaining };
  } catch (err) {
    // Redis unreachable: fail open rather than taking the feature down.
    console.error("[rateLimit] scan limiter unavailable, allowing:", (err as Error).message);
    return { allowed: true, remaining: 999 };
  }
}

// Brute-force protection for credential endpoints, keyed by IP + email.
const authLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  prefix: "dietbuddy:auth",
}) : null;

export async function checkAuthRateLimit(key: string) {
  if (!authLimiter) return true;
  try {
    const { success } = await authLimiter.limit(key);
    return success;
  } catch (err) {
    // Redis unreachable: fail open so login/signup keep working.
    console.error("[rateLimit] auth limiter unavailable, allowing:", (err as Error).message);
    return true;
  }
}

const chatLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(40, "1 h"),
  prefix: "dietbuddy:chat",
}) : null;

/** Caps AI-advisor chat usage per user so one account can't run up the bill. */
export async function checkChatRateLimit(userId: string) {
  if (!chatLimiter) return true;
  try {
    const { success } = await chatLimiter.limit(userId);
    return success;
  } catch (err) {
    console.error("[rateLimit] chat limiter unavailable, allowing:", (err as Error).message);
    return true;
  }
}

export function clientIp(req: Request) {
  return req.headers.get("x-nf-client-connection-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || "unknown";
}

/** For the health endpoint: is the rate limiter really talking to Redis? Never returns keys, URLs or tokens. */
export async function rateLimiterStatus(): Promise<"off" | "on" | `error:${string}`> {
  if (!redis) return "off";
  try {
    await redis.ping();
    return "on";
  } catch (err) {
    const m = String((err as Error)?.message ?? "");
    const kind = /ENOTFOUND|getaddrinfo|fetch failed/i.test(m) ? "unreachable" : /unauthor|WRONGPASS|invalid token|401|403/i.test(m) ? "bad-token" : /parse|JSON|URL/i.test(m) ? "bad-url" : "other";
    return `error:${kind}`;
  }
}
