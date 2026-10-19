import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  enablePush,
  planReadyForPush,
  repointPush,
} from "./browser";

const PLAN_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("planReadyForPush", () => {
  it("requires a UUID planId", () => {
    expect(planReadyForPush(PLAN_ID)).toBe(true);
    expect(planReadyForPush("")).toBe(false);
    expect(planReadyForPush(null)).toBe(false);
    expect(planReadyForPush("not-a-uuid")).toBe(false);
  });
});

describe("enablePush / repointPush bodies", () => {
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
    vi.stubGlobal("navigator", {
      serviceWorker: {
        ready: Promise.resolve({ pushManager }),
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

  it("POSTs subscribe with planId", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await enablePush(PLAN_ID, {
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
          planId: PLAN_ID,
          kinds: { departure: true, return: false, schedule: true },
        }),
      }),
    );
  });

  it("PUTs plan with planId", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const result = await repointPush(PLAN_ID);
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/plan",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          planId: PLAN_ID,
        }),
      }),
    );
  });

  it("surfaces a 400 unknown planId message", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Nie znaleziono wybranego planu." }),
    });

    const result = await enablePush(PLAN_ID, {
      departure: true,
      return: true,
      schedule: false,
    });

    expect(result).toEqual({
      ok: false,
      message: "Nie znaleziono wybranego planu.",
    });
  });
});
