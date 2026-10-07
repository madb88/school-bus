import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedCheckoutUrl } from "./checkout-url";
import { createPlanCheckout } from "./checkout";

const USER = "11111111-1111-4111-8111-111111111111";
const PRICE = "price_PlanPlus0001";
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_abc";

describe("checkout url", () => {
  it("allows only https checkout.stripe.com", () => {
    expect(isAllowedCheckoutUrl(CHECKOUT_URL)).toBe(true);
    expect(isAllowedCheckoutUrl("http://checkout.stripe.com/c/pay/cs_test_abc")).toBe(false);
    expect(isAllowedCheckoutUrl("https://checkout.stripe.com.evil.test/pay")).toBe(false);
    expect(isAllowedCheckoutUrl("https://user:pass@checkout.stripe.com/c/pay/cs_test")).toBe(
      false,
    );
    expect(isAllowedCheckoutUrl("https://stripe.com/pay")).toBe(false);
  });
});

describe("createPlanCheckout", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends the session user to Stripe and returns only the Checkout url", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "unit_test_stripe_secret_key_0001");
    vi.stubEnv("STRIPE_PRICE_ID", PRICE);

    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
      expect(new Headers(init?.headers).get("authorization")).toBe(
        "Bearer unit_test_stripe_secret_key_0001",
      );
      return new Response(JSON.stringify({ url: CHECKOUT_URL }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const result = await createPlanCheckout({
      userId: USER,
      email: "parent@example.com",
      origin: "http://localhost:3000",
      fetchImpl,
    });

    expect(result).toEqual({ ok: true, url: CHECKOUT_URL });
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.body).toEqual(expect.any(String));
    if (!init?.body) return;
    const body = new URLSearchParams(String(init.body));
    expect(body.get("mode")).toBe("payment");
    expect(body.get("customer_email")).toBe("parent@example.com");
    expect(body.get("client_reference_id")).toBe(USER);
    expect(body.get("metadata[user_id]")).toBe(USER);
    expect(body.get("payment_intent_data[metadata][user_id]")).toBe(USER);
    expect(body.get("line_items[0][price]")).toBe(PRICE);
    expect(body.get("line_items[0][quantity]")).toBe("1");
    expect(body.get("payment_method_types[0]")).toBeNull();
    expect(body.get("success_url")).toBe("http://localhost:3000/profil?paid=1");
    expect(body.get("cancel_url")).toBe("http://localhost:3000/profil");
    const headers = new Headers(init.headers);
    expect(headers.get("content-type")).toBe("application/x-www-form-urlencoded");
  });

  it("does not return a url outside Stripe Checkout", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "unit_test_stripe_secret_key_0001");
    vi.stubEnv("STRIPE_PRICE_ID", PRICE);
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ url: "https://evil.example/pay" }), { status: 200 }),
    );
    const result = await createPlanCheckout({
      userId: USER,
      email: "parent@example.com",
      origin: "https://autobusszkolny.pl",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
  });
});
