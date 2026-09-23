import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 3;

type Entry = {
  count: number;
  resetAt: number;
};

const memoryHits = new Map<string, Entry>();

let upstashLimiter: Ratelimit | null | undefined;

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter !== undefined) return upstashLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    upstashLimiter = null;
    return null;
  }

  upstashLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "15 m"),
    prefix: "school-bus:feedback",
    analytics: false,
  });
  return upstashLimiter;
}

function pruneMemory(now: number) {
  for (const [key, entry] of memoryHits) {
    if (entry.resetAt <= now) {
      memoryHits.delete(key);
    }
  }
}

function checkMemoryRateLimit(ip: string): {
  ok: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  pruneMemory(now);

  const key = ip || "unknown";
  const existing = memoryHits.get(key);

  if (!existing || existing.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { ok: true };
}

/**
 * Prefer Upstash Redis when configured (durable across serverless instances).
 * Falls back to in-memory per-instance limits for local/dev.
 */
export async function checkFeedbackRateLimit(ip: string): Promise<{
  ok: boolean;
  retryAfterSec?: number;
}> {
  const limiter = getUpstashLimiter();
  if (!limiter) {
    return checkMemoryRateLimit(ip);
  }

  try {
    const result = await limiter.limit(ip || "unknown");
    if (result.success) {
      return { ok: true };
    }
    return {
      ok: false,
      retryAfterSec: Math.max(
        1,
        Math.ceil((result.reset - Date.now()) / 1000),
      ),
    };
  } catch (error) {
    console.error("Upstash rate limit failed; falling back to memory", error);
    return checkMemoryRateLimit(ip);
  }
}
