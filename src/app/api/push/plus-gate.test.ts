import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listByUser } from "./by-user/[userId]/route";
import { PUT as updateKinds } from "./kinds/route";
import { PUT as updatePlan } from "./plan/route";
import { POST as pushStatus } from "./status/route";
import { DELETE, POST as subscribe } from "./subscribe/route";
import { PUT as updateSubscription } from "./subscriptions/[id]/route";
import { POST as sendTest } from "./test/route";

const backendFetch = vi.fn();

vi.mock("@/lib/auth/backend", () => ({
  backendFetch: (...args: unknown[]) => backendFetch(...args),
}));

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const SUB_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const subscription = {
  endpoint: "https://push.example/device",
  keys: { p256dh: "p256dh-key", auth: "auth-secret" },
};

const planId = "550e8400-e29b-41d4-a716-446655440000";
const planIds = [planId];

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

function getRequest(url: string, cookie?: string) {
  return new Request(url, {
    method: "GET",
    headers: {
      ...(cookie ? { cookie } : {}),
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

describe("push BFF proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    backendFetch.mockResolvedValue({ ok: true, status: 200, data: { ok: true } });
  });

  it("forwards subscribe with session, body, and client IP", async () => {
    const body = { subscription, planIds };
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
    const planBody = { subscription, planIds };
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

  it("forwards status, by-user, and subscriptions update", async () => {
    const cookie = `sb_session=${TOKEN}`;
    const statusBody = { subscription };
    const statusData = {
      subscribed: true,
      planIds,
      kinds: { departure: true, return: true, schedule: false },
    };
    backendFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: statusData,
    });

    const statusResponse = await pushStatus(
      jsonRequest(
        "http://localhost:3000/api/push/status",
        "POST",
        statusBody,
        cookie,
      ),
    );
    expect(statusResponse.status).toBe(200);
    expect(await statusResponse.json()).toEqual(statusData);
    expect(backendFetch).toHaveBeenNthCalledWith(1, "/api/v1/push/status", {
      method: "POST",
      body: statusBody,
      sessionToken: TOKEN,
      clientIp: "203.0.113.10",
    });

    const devices = [
      {
        id: SUB_ID,
        endpoint: subscription.endpoint,
        planIds,
        kinds: { departure: true, return: true, schedule: true },
      },
    ];
    backendFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: devices,
    });

    const listResponse = await listByUser(
      getRequest(
        `http://localhost:3000/api/push/by-user/${USER_ID}`,
        cookie,
      ),
      { params: Promise.resolve({ userId: USER_ID }) },
    );
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual(devices);
    expect(backendFetch).toHaveBeenNthCalledWith(
      2,
      `/api/v1/push/by-user/${USER_ID}`,
      {
        method: "GET",
        sessionToken: TOKEN,
        clientIp: "203.0.113.10",
      },
    );

    const patchBody = { planIds, kinds: { departure: false, return: true, schedule: true } };
    backendFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      data: { ok: true },
    });

    const updateResponse = await updateSubscription(
      jsonRequest(
        `http://localhost:3000/api/push/subscriptions/${SUB_ID}`,
        "PUT",
        patchBody,
        cookie,
      ),
      { params: Promise.resolve({ id: SUB_ID }) },
    );
    expect(updateResponse.status).toBe(200);
    expect(backendFetch).toHaveBeenNthCalledWith(
      3,
      `/api/v1/push/subscriptions/${SUB_ID}`,
      {
        method: "PUT",
        body: patchBody,
        sessionToken: TOKEN,
        clientIp: "203.0.113.10",
      },
    );
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
        { subscription, planIds },
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
        { subscription, planIds },
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
        planIds,
      }),
    );

    expect(response.status).toBe(401);
    expect(backendFetch).toHaveBeenCalledWith("/api/v1/push/subscribe", {
      method: "POST",
      body: { subscription, planIds },
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
