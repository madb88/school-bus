import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkPushSubscribeRateLimit,
  checkPushTestRateLimit,
  getClientIpFromHeaders,
} from "./rate-limit";

describe("push rate-limit", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads client IP from x-forwarded-for", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
    });
    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("limits subscribe attempts in memory fallback", async () => {
    const ip = `subscribe-test-${Date.now()}`;
    for (let i = 0; i < 10; i += 1) {
      const result = await checkPushSubscribeRateLimit(ip);
      expect(result.ok).toBe(true);
    }
    const blocked = await checkPushSubscribeRateLimit(ip);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("limits test attempts in memory fallback", async () => {
    const ip = `test-test-${Date.now()}`;
    for (let i = 0; i < 5; i += 1) {
      const result = await checkPushTestRateLimit(ip);
      expect(result.ok).toBe(true);
    }
    const blocked = await checkPushTestRateLimit(ip);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});
