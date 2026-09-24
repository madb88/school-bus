import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const CREATE_MAX = 10;
const REDEEM_MAX = 30;

type Entry = {
  count: number;
  resetAt: number;
};

const memoryHits = new Map<string, Entry>();

let createLimiter: Ratelimit | null | undefined;
let redeemLimiter: Ratelimit | null | undefined;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getCreateLimiter(): Ratelimit | null {
  if (createLimiter !== undefined) return createLimiter;
  const redis = getRedis();
  if (!redis) {
    createLimiter = null;
    return null;
  }
  createLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(CREATE_MAX, "15 m"),
    prefix: "school-bus:transfer-create",
    analytics: false,
  });
  return createLimiter;
}

function getRedeemLimiter(): Ratelimit | null {
  if (redeemLimiter !== undefined) return redeemLimiter;
  const redis = getRedis();
  if (!redis) {
    redeemLimiter = null;
    return null;
  }
  redeemLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(REDEEM_MAX, "15 m"),
    prefix: "school-bus:transfer-redeem",
    analytics: false,
  });
  return redeemLimiter;
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
  const key = bucket;
  const existing = memoryHits.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt: now + WINDOW_MS });
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
    console.error("Transfer rate limit failed; falling back to memory", error);
    return checkMemory(memoryKey, max);
  }
}

export async function checkTransferCreateRateLimit(ip: string) {
  return checkLimiter(
    getCreateLimiter(),
    ip,
    `create:${ip || "unknown"}`,
    CREATE_MAX,
  );
}

export async function checkTransferRedeemRateLimit(ip: string) {
  return checkLimiter(
    getRedeemLimiter(),
    ip,
    `redeem:${ip || "unknown"}`,
    REDEEM_MAX,
  );
}

export function getClientIpFromHeaders(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip")?.trim() || "unknown";
}
