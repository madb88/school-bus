import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  COMPLAINT_USER_MAX,
  COMPLAINT_WINDOW,
  COMPLAINT_WINDOW_MS,
} from "@/lib/billing/constants";

type Entry = { count: number; resetAt: number };

const memoryHits = new Map<string, Entry>();

let complaintLimiter: Ratelimit | null | undefined;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function resetComplaintRateLimitCache(): void {
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
    memoryHits.set(bucket, { count: 1, resetAt: now + COMPLAINT_WINDOW_MS });
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

export async function checkComplaintRateLimit(userId: string) {
  if (complaintLimiter === undefined) {
    const redis = getRedis();
    complaintLimiter = redis
      ? new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(COMPLAINT_USER_MAX, COMPLAINT_WINDOW),
          prefix: "school-bus:billing-complaint-user",
          analytics: false,
        })
      : null;
  }

  if (!complaintLimiter) {
    return checkMemory(`complaint-user:${userId}`, COMPLAINT_USER_MAX);
  }

  try {
    const result = await complaintLimiter.limit(userId || "unknown");
    if (result.success) return { ok: true };
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch {
    console.error("Complaint rate limit failed; falling back to memory");
    return checkMemory(`complaint-user:${userId}`, COMPLAINT_USER_MAX);
  }
}
