import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const freeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "dietbuddy:scan:free",
});

const premiumLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1 d"),
  prefix: "dietbuddy:scan:premium",
});

export async function checkScanRateLimit(userId: string, isPremium = false) {
  const limiter = isPremium ? premiumLimiter : freeLimiter;
  const { success, remaining } = await limiter.limit(userId);
  return { allowed: success, remaining };
}
