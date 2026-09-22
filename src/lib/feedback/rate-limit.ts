const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 3;

type Entry = {
  count: number;
  resetAt: number;
};

const hits = new Map<string, Entry>();

function prune(now: number) {
  for (const [key, entry] of hits) {
    if (entry.resetAt <= now) {
      hits.delete(key);
    }
  }
}

/** Best-effort in-memory limit (per server instance). */
export function checkFeedbackRateLimit(ip: string): {
  ok: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  prune(now);

  const key = ip || "unknown";
  const existing = hits.get(key);

  if (!existing || existing.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
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
