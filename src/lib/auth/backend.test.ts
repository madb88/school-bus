import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_BAD_EMAIL,
  AUTH_TOO_MANY,
  AUTH_UNAVAILABLE,
} from "./messages";
import {
  backendConfig,
  backendFetch,
  createCheckout,
  fetchMe,
  fetchPlus,
  fetchPlusForUser,
  rememberPaymentReturn,
  requestMagicLink,
  updateMyPlans,
  verifyLink,
} from "./backend";

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

describe("auth backend client", () => {
  beforeEach(() => {
    vi.stubEnv("BACKEND_API_URL", "http://backend.test");
    vi.stubEnv("BACKEND_SERVICE_KEY", "dev-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns null config when env is incomplete", () => {
    vi.stubEnv("BACKEND_API_URL", "");
    expect(backendConfig()).toBeNull();
  });

  it("sends service key, client IP and Bearer", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ ok: true }), { status: 202 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await requestMagicLink("parent@example.com", "203.0.113.9");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://backend.test/api/v1/auth/magic-link");
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Service-Key")).toBe("dev-key");
    expect(headers.get("X-Client-IP")).toBe("203.0.113.9");
    expect(headers.get("Authorization")).toBeNull();
  });

  it("forwards Bearer on verify when a previous session exists", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            sessionToken: TOKEN,
            expiresAt: "2099-01-01T00:00:00.000Z",
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              email: "parent@example.com",
              role: "individual",
              createdAt: "2026-01-01T00:00:00.000Z",
              plans: [],
            },
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyLink("magic-token", TOKEN);
    expect(result.ok).toBe(true);
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it("maps detail string, 422 to BAD_EMAIL, 429 Retry-After, and network to UNAVAILABLE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ detail: "custom" }), { status: 503 })),
    );
    expect(await backendFetch("/x", { method: "GET" })).toEqual({
      ok: false,
      status: 503,
      error: "custom",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify([{ type: "value_error" }]), { status: 422 }),
      ),
    );
    expect(await backendFetch("/x", { method: "POST", body: {} })).toEqual({
      ok: false,
      status: 422,
      error: AUTH_BAD_EMAIL,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "slow down" }), {
            status: 429,
            headers: { "Retry-After": "42" },
          }),
      ),
    );
    expect(await backendFetch("/x", { method: "GET" })).toEqual({
      ok: false,
      status: 429,
      error: "slow down",
      retryAfterSec: 42,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      }),
    );
    expect(await backendFetch("/x", { method: "GET" })).toEqual({
      ok: false,
      status: 503,
      error: AUTH_UNAVAILABLE,
    });
  });

  it("returns unavailable without calling fetch when config is missing", async () => {
    vi.stubEnv("BACKEND_SERVICE_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await requestMagicLink("a@b.co", "1.1.1.1")).toEqual({
      ok: false,
      status: 503,
      error: AUTH_UNAVAILABLE,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetchMe maps 401 to null and network to unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    expect(await fetchMe(TOKEN)).toBeNull();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    expect(await fetchMe(TOKEN)).toBe("unavailable");
  });

  it("uses TOO_MANY when 429 has no detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 429, headers: { "Retry-After": "9" } })),
    );
    expect(await backendFetch("/x", { method: "GET" })).toEqual({
      ok: false,
      status: 429,
      error: AUTH_TOO_MANY,
      retryAfterSec: 9,
    });
  });

  it("createCheckout returns the URL and maps a bad body to 503", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test" }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await createCheckout(TOKEN, "203.0.113.9")).toEqual({
      ok: true,
      url: "https://checkout.stripe.com/c/pay/cs_test",
    });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("X-Client-IP")).toBe("203.0.113.9");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    );
    expect(await createCheckout(TOKEN, "1.1.1.1")).toEqual({
      ok: false,
      status: 503,
      error: "Nie udało się rozpocząć płatności. Spróbuj później.",
    });
  });

  it("fetchPlus maps shapes and treats 401 / bad body as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ state: "active", validUntil: "2027-08-31" }), {
            status: 200,
          }),
      ),
    );
    expect(await fetchPlus(TOKEN)).toEqual({
      state: "active",
      validUntil: "2027-08-31",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ state: "trial", validUntil: "2026-10-30" }), {
            status: 200,
          }),
      ),
    );
    expect(await fetchPlus(TOKEN)).toEqual({
      state: "trial",
      validUntil: "2026-10-30",
    });

    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 401 })));
    expect(await fetchPlus(TOKEN)).toBe("unavailable");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ state: "active" }), { status: 200 })),
    );
    expect(await fetchPlus(TOKEN)).toBe("unavailable");
  });

  it("updateMyPlans returns the user and passes 403/422 detail through", async () => {
    const user = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "parent@example.com",
      role: "individual",
      createdAt: "2026-01-01T00:00:00.000Z",
      plans: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(user), { status: 200 })),
    );
    expect(await updateMyPlans(TOKEN, [])).toEqual({ ok: true, user });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "Zapisywanie planów wymaga Planu Plus" }), {
            status: 403,
          }),
      ),
    );
    expect(await updateMyPlans(TOKEN, [])).toEqual({
      ok: false,
      status: 403,
      error: "Zapisywanie planów wymaga Planu Plus",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "Możesz zapisać najwyżej 5 planów" }), {
            status: 422,
          }),
      ),
    );
    expect(await updateMyPlans(TOKEN, [])).toEqual({
      ok: false,
      status: 422,
      error: "Możesz zapisać najwyżej 5 planów",
    });
  });

  it("rememberPaymentReturn and fetchPlusForUser hit the billing routes", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ state: "pending" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await rememberPaymentReturn(TOKEN)).toEqual({ state: "pending" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://backend.test/api/v1/billing/plus/return",
    );

    expect(
      await fetchPlusForUser("11111111-1111-4111-8111-111111111111"),
    ).toEqual({ state: "pending" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "http://backend.test/api/v1/billing/users/11111111-1111-4111-8111-111111111111/plus",
    );
  });
});
