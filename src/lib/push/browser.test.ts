import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enablePush,
  getPushStatus,
  normalizePlanIds,
  planReadyForPush,
  setPushPlans,
} from "./browser";

const PLAN_ID = "550e8400-e29b-41d4-a716-446655440000";
const PLAN_ID_2 = "660e8400-e29b-41d4-a716-446655440001";

describe("planReadyForPush / normalizePlanIds", () => {
  it("requires a non-empty list of UUID planIds", () => {
    expect(planReadyForPush([PLAN_ID])).toBe(true);
    expect(planReadyForPush([PLAN_ID, PLAN_ID_2])).toBe(true);
    expect(planReadyForPush([])).toBe(false);
    expect(planReadyForPush(null)).toBe(false);
    expect(planReadyForPush(["not-a-uuid"])).toBe(false);
    expect(planReadyForPush([PLAN_ID, "bad"])).toBe(false);
  });

  it("dedupes and drops invalid ids", () => {
    expect(normalizePlanIds([PLAN_ID, PLAN_ID, "x", PLAN_ID_2])).toEqual([
      PLAN_ID,
      PLAN_ID_2,
    ]);
    expect(normalizePlanIds(null)).toEqual([]);
  });
});

describe("enablePush / setPushPlans / getPushStatus bodies", () => {
  const fetchMock = vi.fn();
  const unsubscribe = vi.fn();
  const subscription = {
    toJSON: () => ({
      endpoint: "https://push.example/device",
      keys: { p256dh: "p", auth: "a" },
    }),
    unsubscribe,
  };

  beforeEach(() => {
    fetchMock.mockReset();
    unsubscribe.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
      "BPtestpublickeyfortests0123456789abcdefghijklmnopqrs";

    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(subscription),
      subscribe: vi.fn().mockResolvedValue(subscription),
    };
    const registration = { pushManager };
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue(registration),
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    });
    vi.stubGlobal("Notification", {
      requestPermission: vi.fn().mockResolvedValue("granted"),
      permission: "granted",
    });
    vi.stubGlobal("PushManager", function PushManager() {});
    vi.stubGlobal("window", {
      ...globalThis,
      dispatchEvent: () => true,
      Notification: globalThis.Notification,
      PushManager: globalThis.PushManager,
      navigator: globalThis.navigator,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  });

  it("POSTs subscribe with planIds", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await enablePush([PLAN_ID, PLAN_ID_2], {
      departure: true,
      return: false,
      schedule: true,
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/subscribe",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          planIds: [PLAN_ID, PLAN_ID_2],
          kinds: { departure: true, return: false, schedule: true },
        }),
      }),
    );
  });

  it("PUTs plan with planIds", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await setPushPlans([PLAN_ID]);
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/plan",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          planIds: [PLAN_ID],
        }),
      }),
    );
  });

  it("rejects an empty planIds list client-side", async () => {
    const result = await setPushPlans([]);
    expect(result).toEqual({
      ok: false,
      message: "Najpierw zapisz plan lekcji na koncie.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces a 400 unknown planIds message", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Nie znaleziono wybranego planu." }),
    });

    const result = await enablePush([PLAN_ID], {
      departure: true,
      return: true,
      schedule: false,
    });

    expect(result).toEqual({
      ok: false,
      message: "Nie znaleziono wybranego planu.",
    });
  });

  it("returns a browser message when PushManager.subscribe throws", async () => {
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockRejectedValue(new Error("AbortError")),
    };
    const registration = { pushManager };
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue(registration),
        register: vi.fn().mockResolvedValue(registration),
        ready: Promise.resolve(registration),
      },
    });

    const result = await enablePush([PLAN_ID], {
      departure: true,
      return: true,
      schedule: false,
    });

    expect(result).toEqual({
      ok: false,
      message: "Nie udało się włączyć powiadomień w tej przeglądarce.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers the service worker when none is active yet", async () => {
    const pushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(subscription),
    };
    const registration = { pushManager };
    const register = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue(undefined),
        register,
        ready: Promise.resolve(registration),
      },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await enablePush([PLAN_ID], {
      departure: true,
      return: true,
      schedule: false,
    });

    expect(result).toEqual({ ok: true });
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(fetchMock).toHaveBeenCalled();
  });

  it("POSTs status and returns subscribed planIds", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        subscribed: true,
        planIds: [PLAN_ID, PLAN_ID_2],
        kinds: { departure: true, return: false, schedule: true },
      }),
    });

    const status = await getPushStatus();
    expect(status).toEqual({
      subscribed: true,
      planIds: [PLAN_ID, PLAN_ID_2],
      kinds: { departure: true, return: false, schedule: true },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/status",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      }),
    );
  });
});
