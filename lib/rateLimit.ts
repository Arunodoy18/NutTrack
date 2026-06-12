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
  
  const { success, remaining } = await limiter.limit(userId);
  return { allowed: success, remaining };
}
