import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  MAGIC_LINK_EMAIL_MAX,
  MAGIC_LINK_IP_MAX,
  MAGIC_LINK_IP_WINDOW,
  MAGIC_LINK_IP_WINDOW_MS,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_WINDOW_MS,
  VERIFY_IP_MAX,
} from "./constants";

type Entry = {
  count: number;
  resetAt: number;
};

const memoryHits = new Map<string, Entry>();

let sendIpLimiter: Ratelimit | null | undefined;
let sendEmailLimiter: Ratelimit | null | undefined;
let verifyIpLimiter: Ratelimit | null | undefined;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function limiter(
  max: number,
  window: typeof RATE_LIMIT_WINDOW | typeof MAGIC_LINK_IP_WINDOW,
  prefix: string,
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    prefix,
    analytics: false,
  });
}

function getSendIpLimiter(): Ratelimit | null {
  if (sendIpLimiter !== undefined) return sendIpLimiter;
  sendIpLimiter = limiter(MAGIC_LINK_IP_MAX, MAGIC_LINK_IP_WINDOW, "school-bus:auth-magic-ip");
  return sendIpLimiter;
}

function getSendEmailLimiter(): Ratelimit | null {
  if (sendEmailLimiter !== undefined) return sendEmailLimiter;
  sendEmailLimiter = limiter(MAGIC_LINK_EMAIL_MAX, RATE_LIMIT_WINDOW, "school-bus:auth-magic-email");
  return sendEmailLimiter;
}

function getVerifyIpLimiter(): Ratelimit | null {
  if (verifyIpLimiter !== undefined) return verifyIpLimiter;
  verifyIpLimiter = limiter(VERIFY_IP_MAX, RATE_LIMIT_WINDOW, "school-bus:auth-verify-ip");
  return verifyIpLimiter;
}

/** Reset cached limiters (tests only). */
export function resetAuthRateLimitCache(): void {
  sendIpLimiter = undefined;
  sendEmailLimiter = undefined;
  verifyIpLimiter = undefined;
  memoryHits.clear();
}

function pruneMemory(now: number) {
  for (const [key, entry] of memoryHits) {
    if (entry.resetAt <= now) memoryHits.delete(key);
  }
}

function checkMemory(
  bucket: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  pruneMemory(now);
  const existing = memoryHits.get(bucket);

  if (!existing || existing.resetAt <= now) {
    memoryHits.set(bucket, { count: 1, resetAt: now + windowMs });
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
  limit: Ratelimit | null,
  id: string,
  memoryKey: string,
  max: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec?: number }> {
  if (!limit) return checkMemory(memoryKey, max, windowMs);

  try {
    const result = await limit.limit(id || "unknown");
    if (result.success) return { ok: true };
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch {
    console.error("Auth rate limit failed; falling back to memory");
    return checkMemory(memoryKey, max, windowMs);
  }
}

export function getClientIpFromHeaders(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip")?.trim() || "unknown";
}

export async function checkMagicLinkIpRateLimit(ip: string) {
  return checkLimiter(
    getSendIpLimiter(),
    ip,
    `magic-ip:${ip || "unknown"}`,
    MAGIC_LINK_IP_MAX,
    MAGIC_LINK_IP_WINDOW_MS,
  );
}

export async function checkMagicLinkEmailRateLimit(email: string) {
  return checkLimiter(
    getSendEmailLimiter(),
    email,
    `magic-email:${email || "unknown"}`,
    MAGIC_LINK_EMAIL_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
}

export async function checkVerifyIpRateLimit(ip: string) {
  return checkLimiter(
    getVerifyIpLimiter(),
    ip,
    `verify-ip:${ip || "unknown"}`,
    VERIFY_IP_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
}
