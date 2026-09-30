import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  CHECKOUT_IP_MAX,
  CHECKOUT_USER_MAX,
  CHECKOUT_WINDOW,
  CHECKOUT_WINDOW_MS,
  COMPLAINT_USER_MAX,
} from "./constants";

type Entry = { count: number; resetAt: number };

const memoryHits = new Map<string, Entry>();

let userLimiter: Ratelimit | null | undefined;
let ipLimiter: Ratelimit | null | undefined;
let complaintLimiter: Ratelimit | null | undefined;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function build(prefix: string, max: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, CHECKOUT_WINDOW),
    prefix,
    analytics: false,
  });
}

export function resetCheckoutRateLimitCache(): void {
  userLimiter = undefined;
  ipLimiter = undefined;
  complaintLimiter = undefined;
  memoryHits.clear();
}

function checkMemory(
  bucket: string,
  max: number,
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  for (const [key, entry] of memoryHits) {
    if (entry.resetAt <= now) memoryHits.delete(key);
  }
  const existing = memoryHits.get(bucket);
  if (!existing || existing.resetAt <= now) {
    memoryHits.set(bucket, { count: 1, resetAt: now + CHECKOUT_WINDOW_MS });
    return { ok: true };
  }
  if (existing.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

async function checkOne(
  limit: Ratelimit | null,
  id: string,
  memoryKey: string,
  max: number,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  if (!limit) return checkMemory(memoryKey, max);
  try {
    const result = await limit.limit(id || "unknown");
    if (result.success) return { ok: true };
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch {
    console.error("Billing rate limit failed; falling back to memory");
    return checkMemory(memoryKey, max);
  }
}

export async function checkCheckoutRateLimit(userId: string, ip: string) {
  if (userLimiter === undefined) {
    userLimiter = build("school-bus:billing-checkout-user", CHECKOUT_USER_MAX);
  }
  if (ipLimiter === undefined) {
    ipLimiter = build("school-bus:billing-checkout-ip", CHECKOUT_IP_MAX);
  }
  const byUser = await checkOne(
    userLimiter,
    userId,
    `checkout-user:${userId}`,
    CHECKOUT_USER_MAX,
  );
  if (!byUser.ok) return byUser;
  return checkOne(ipLimiter, ip, `checkout-ip:${ip || "unknown"}`, CHECKOUT_IP_MAX);
}

export async function checkComplaintRateLimit(userId: string) {
  if (complaintLimiter === undefined) {
    complaintLimiter = build("school-bus:billing-complaint-user", COMPLAINT_USER_MAX);
  }
  return checkOne(
    complaintLimiter,
    userId,
    `complaint-user:${userId}`,
    COMPLAINT_USER_MAX,
  );
}
