import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT as updateKinds } from "./kinds/route";
import { PUT as updatePlan } from "./plan/route";
import { DELETE, POST as subscribe } from "./subscribe/route";
import { POST as sendTest } from "./test/route";

const backendFetch = vi.fn();

vi.mock("@/lib/auth/backend", () => ({
  backendFetch: (...args: unknown[]) => backendFetch(...args),
}));

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";

const subscription = {
  endpoint: "https://push.example/device",
  keys: { p256dh: "p256dh-key", auth: "auth-secret" },
};

const planId = "550e8400-e29b-41d4-a716-446655440000";

function jsonRequest(url: string, method: string, body: unknown, cookie?: string) {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
      "x-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

describe("push BFF proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backendFetch.mockResolvedValue({ ok: true, status: 200, data: { ok: true } });
  });

  it("forwards subscribe with session, body, and client IP", async () => {
    const body = { subscription, planId };
    const response = await subscribe(
      jsonRequest(
        "http://localhost:3000/api/push/subscribe",
        "POST",
        body,
        `sb_session=${TOKEN}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(backendFetch).toHaveBeenCalledWith("/api/v1/push/subscribe", {
      method: "POST",
      body,
      sessionToken: TOKEN,
      clientIp: "203.0.113.10",
    });
  });

  it("forwards plan, kinds, test, and delete with the same proxy shape", async () => {
    const planBody = { subscription, planId };
    const kindsBody = {
      subscription,
      kinds: { departure: true, return: false, schedule: true },
    };
    const testBody = { subscription };
    const cookie = `sb_session=${TOKEN}`;

    await updatePlan(
      jsonRequest("http://localhost:3000/api/push/plan", "PUT", planBody, cookie),
    );
    await updateKinds(
      jsonRequest("http://localhost:3000/api/push/kinds", "PUT", kindsBody, cookie),
    );
    await sendTest(
      jsonRequest("http://localhost:3000/api/push/test", "POST", testBody, cookie),
    );
    await DELETE(
      jsonRequest(
        "http://localhost:3000/api/push/subscribe",
        "DELETE",
        testBody,
        cookie,
      ),
    );

    expect(backendFetch).toHaveBeenNthCalledWith(1, "/api/v1/push/plan", {
      method: "PUT",
      body: planBody,
      sessionToken: TOKEN,
      clientIp: "203.0.113.10",
    });
    expect(backendFetch).toHaveBeenNthCalledWith(2, "/api/v1/push/kinds", {
      method: "PUT",
      body: kindsBody,
      sessionToken: TOKEN,
      clientIp: "203.0.113.10",
    });
    expect(backendFetch).toHaveBeenNthCalledWith(3, "/api/v1/push/test", {
      method: "POST",
      body: testBody,
      sessionToken: TOKEN,
      clientIp: "203.0.113.10",
    });
    expect(backendFetch).toHaveBeenNthCalledWith(4, "/api/v1/push/subscribe", {
      method: "DELETE",
      body: testBody,
      sessionToken: TOKEN,
      clientIp: "203.0.113.10",
    });
  });

  it("maps backend detail to {error} and preserves status / Retry-After", async () => {
    backendFetch.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Powiadomienia wymagają aktywnego Planu Plus.",
    });

    const denied = await subscribe(
      jsonRequest(
        "http://localhost:3000/api/push/subscribe",
        "POST",
        { subscription, planId },
        `sb_session=${TOKEN}`,
      ),
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({
      error: "Powiadomienia wymagają aktywnego Planu Plus.",
    });

    backendFetch.mockResolvedValue({
      ok: false,
      status: 400,
      error: "Nie znaleziono wybranego planu.",
    });

    const unknownPlan = await updatePlan(
      jsonRequest(
        "http://localhost:3000/api/push/plan",
        "PUT",
        { subscription, planId },
        `sb_session=${TOKEN}`,
      ),
    );
    expect(unknownPlan.status).toBe(400);
    expect(await unknownPlan.json()).toEqual({
      error: "Nie znaleziono wybranego planu.",
    });

    backendFetch.mockResolvedValue({
      ok: false,
      status: 429,
      error: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
      retryAfterSec: 42,
    });

    const limited = await sendTest(
      jsonRequest(
        "http://localhost:3000/api/push/test",
        "POST",
        { subscription },
        `sb_session=${TOKEN}`,
      ),
    );
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBe("42");
    expect(await limited.json()).toEqual({
      error: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
    });
  });

  it("forwards without a session token when the cookie is missing", async () => {
    backendFetch.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Zaloguj się, żeby korzystać z powiadomień.",
    });

    const response = await subscribe(
      jsonRequest("http://localhost:3000/api/push/subscribe", "POST", {
        subscription,
        planId,
      }),
    );

    expect(response.status).toBe(401);
    expect(backendFetch).toHaveBeenCalledWith("/api/v1/push/subscribe", {
      method: "POST",
      body: { subscription, planId },
      sessionToken: undefined,
      clientIp: "203.0.113.10",
    });
  });

  it("rejects invalid JSON before calling the backend", async () => {
    const response = await subscribe(
      new Request("http://localhost:3000/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Niepoprawne żądanie." });
    expect(backendFetch).not.toHaveBeenCalled();
  });
});
