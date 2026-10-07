import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_BAD_EMAIL,
  AUTH_TOO_MANY,
  AUTH_UNAVAILABLE,
} from "./messages";
import {
  backendConfig,
  backendFetch,
  fetchMe,
  requestMagicLink,
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
              role: "user",
              createdAt: "2026-01-01T00:00:00.000Z",
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
});
