import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetAuthRedisCache } from "@/lib/auth/redis";
import { POST } from "./route";

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "unit_test_stripe_secret_key_0001");
    vi.stubEnv("STRIPE_PRICE_ID", "price_PlanPlus0001");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test_secret_value_0001");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    resetAuthRedisCache();
  });

  it("rejects a body without a signature", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/billing/webhook", {
        method: "POST",
        body: JSON.stringify({ type: "checkout.session.completed" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects a body with the wrong signature", async () => {
    const body = JSON.stringify({ type: "checkout.session.completed" });
    const response = await POST(
      new Request("http://localhost:3000/api/billing/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=" + "a".repeat(64) },
        body,
      }),
    );
    expect(response.status).toBe(401);
  });
});
