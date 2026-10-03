import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createPlanCheckout } from "@/lib/billing/checkout";
import { resetCheckoutRateLimitCache } from "@/lib/billing/rate-limit";
import { POST } from "./route";

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/billing/checkout", () => ({
  createPlanCheckout: vi.fn(),
}));

const SESSION_USER = "11111111-1111-4111-8111-111111111111";

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    resetCheckoutRateLimitCache();
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(createPlanCheckout).mockReset();
  });

  it("ignores user_id and email from the body", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      userId: SESSION_USER,
      email: "parent@example.com",
    });
    vi.mocked(createPlanCheckout).mockResolvedValue({
      ok: true,
      url: "https://checkout.stripe.com/c/pay/cs_test_abc",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: "22222222-2222-4222-8222-222222222222",
          email: "evil@example.com",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_abc",
    });
    expect(createPlanCheckout).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createPlanCheckout).mock.calls[0]?.[0]).toEqual({
      userId: SESSION_USER,
      email: "parent@example.com",
      origin: "http://localhost:3000",
    });
  });

  it("does not start checkout without a session, even with a user_id in the body", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: SESSION_USER, email: "parent@example.com" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(createPlanCheckout).not.toHaveBeenCalled();
  });
});
