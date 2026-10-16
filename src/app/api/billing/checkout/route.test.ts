import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckout } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { POST } from "./route";

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/auth/backend", () => ({
  createCheckout: vi.fn(),
}));

const SESSION_USER = "11111111-1111-4111-8111-111111111111";
const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

function asUser() {
  vi.mocked(getCurrentUser).mockResolvedValue({
    userId: SESSION_USER,
    email: "parent@example.com",
    role: "individual",
    plans: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    sessionToken: TOKEN,
  });
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReset();
    vi.mocked(createCheckout).mockReset();
  });

  it("returns 401 without a session", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("passes through 429 with Retry-After", async () => {
    asUser();
    vi.mocked(createCheckout).mockResolvedValue({
      ok: false,
      status: 429,
      error: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
      retryAfterSec: 42,
    });

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", { method: "POST" }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(await response.json()).toEqual({
      error: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
    });
  });

  it("passes through 503", async () => {
    asUser();
    vi.mocked(createCheckout).mockResolvedValue({
      ok: false,
      status: 503,
      error: "Płatność nie jest teraz dostępna. Spróbuj później.",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", { method: "POST" }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Płatność nie jest teraz dostępna. Spróbuj później.",
    });
  });

  it("rejects a non-Stripe checkout URL", async () => {
    asUser();
    vi.mocked(createCheckout).mockResolvedValue({
      ok: true,
      url: "https://evil.example/pay",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", { method: "POST" }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Nie udało się rozpocząć płatności. Spróbuj później.",
    });
  });

  it("returns the hosted Checkout URL", async () => {
    asUser();
    vi.mocked(createCheckout).mockResolvedValue({
      ok: true,
      url: "https://checkout.stripe.com/c/pay/cs_test_abc",
    });

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.9" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: "https://checkout.stripe.com/c/pay/cs_test_abc",
    });
    expect(createCheckout).toHaveBeenCalledWith(TOKEN, "203.0.113.9");
  });
});
