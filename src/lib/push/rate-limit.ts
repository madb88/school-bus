import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const SUBSCRIBE_MAX = 10;
const TEST_MAX = 5;

type Entry = {
  count: number;
  resetAt: number;
};

const memoryHits = new Map<string, Entry>();

let subscribeLimiter: Ratelimit | null | undefined;
let testLimiter: Ratelimit | null | undefined;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getSubscribeLimiter(): Ratelimit | null {
  if (subscribeLimiter !== undefined) return subscribeLimiter;
  const redis = getRedis();
  if (!redis) {
    subscribeLimiter = null;
    return null;
  }
  subscribeLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(SUBSCRIBE_MAX, "15 m"),
    prefix: "school-bus:push-subscribe",
    analytics: false,
  });
  return subscribeLimiter;
}

function getTestLimiter(): Ratelimit | null {
  if (testLimiter !== undefined) return testLimiter;
  const redis = getRedis();
  if (!redis) {
    testLimiter = null;
    return null;
  }
  testLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(TEST_MAX, "15 m"),
    prefix: "school-bus:push-test",
    analytics: false,
  });
  return testLimiter;
}

function pruneMemory(now: number) {
  for (const [key, entry] of memoryHits) {
    if (entry.resetAt <= now) memoryHits.delete(key);
  }
}

function checkMemory(
  bucket: string,
  max: number,
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  pruneMemory(now);
  const existing = memoryHits.get(bucket);

  if (!existing || existing.resetAt <= now) {
    memoryHits.set(bucket, { count: 1, resetAt: now + WINDOW_MS });
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

async function checkLimiter(
  limiter: Ratelimit | null,
  ip: string,
  memoryKey: string,
  max: number,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  if (!limiter) {
    return checkMemory(memoryKey, max);
  }

  try {
    const result = await limiter.limit(ip || "unknown");
    if (result.success) return { ok: true };
    return {
      ok: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000),
      ),
    };
  } catch (error) {
    console.error("Push rate limit failed; falling back to memory", error);
    return checkMemory(memoryKey, max);
  }
}

export async function checkPushSubscribeRateLimit(ip: string) {
  return checkLimiter(
    getSubscribeLimiter(),
    ip,
    `subscribe:${ip || "unknown"}`,
    SUBSCRIBE_MAX,
  );
}

export async function checkPushTestRateLimit(ip: string) {
  return checkLimiter(
    getTestLimiter(),
    ip,
    `test:${ip || "unknown"}`,
    TEST_MAX,
  );
}

export function getClientIpFromHeaders(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip")?.trim() || "unknown";
}
