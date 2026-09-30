import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAGIC_LINK_EMAIL_MAX, MAGIC_LINK_IP_MAX, VERIFY_IP_MAX } from "./constants";
import {
  checkMagicLinkEmailRateLimit,
  checkMagicLinkIpRateLimit,
  checkVerifyIpRateLimit,
  resetAuthRateLimitCache,
} from "./rate-limit";

describe("auth rate limit memory fallback", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    resetAuthRateLimitCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAuthRateLimitCache();
  });

  it("limits magic-link sends per IP and per email", async () => {
    const ip = "198.51.100.10";
    for (let i = 0; i < MAGIC_LINK_IP_MAX; i += 1) {
      expect((await checkMagicLinkIpRateLimit(ip)).ok).toBe(true);
    }
    const blockedIp = await checkMagicLinkIpRateLimit(ip);
    expect(blockedIp.ok).toBe(false);
    expect(blockedIp.retryAfterSec).toBeGreaterThan(30 * 60);

    const email = "ada@example.com";
    for (let i = 0; i < MAGIC_LINK_EMAIL_MAX; i += 1) {
      expect((await checkMagicLinkEmailRateLimit(email)).ok).toBe(true);
    }
    const blockedEmail = await checkMagicLinkEmailRateLimit(email);
    expect(blockedEmail.ok).toBe(false);
    expect(blockedEmail.retryAfterSec).toBeLessThanOrEqual(15 * 60);
  });

  it("limits code checks per IP", async () => {
    const ip = "198.51.100.20";
    for (let i = 0; i < VERIFY_IP_MAX; i += 1) {
      expect((await checkVerifyIpRateLimit(ip)).ok).toBe(true);
    }
    expect((await checkVerifyIpRateLimit(ip)).ok).toBe(false);
  });
});
