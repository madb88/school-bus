import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUSH_LOGIN_REQUIRED, PUSH_NOT_YOURS, PUSH_PLUS_REQUIRED } from "@/lib/push/access";
import { PUT as updateKinds } from "./kinds/route";
import { PUT as updatePlan } from "./plan/route";
import { DELETE, POST as subscribe } from "./subscribe/route";
import { POST as sendTest } from "./test/route";

const getCurrentUser = vi.fn();
const readEntitlement = vi.fn();
const getPushRecord = vi.fn();
const savePushRecord = vi.fn();
const deletePushRecord = vi.fn();
const sendPush = vi.fn();

vi.mock("@/lib/auth/current-user", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@/lib/billing/store", () => ({
  readEntitlement: (...args: unknown[]) => readEntitlement(...args),
}));

vi.mock("@/lib/push/rate-limit", () => ({
  checkPushSubscribeRateLimit: async () => ({ ok: true }),
  checkPushTestRateLimit: async () => ({ ok: true }),
  getClientIpFromHeaders: () => "203.0.113.10",
}));

vi.mock("@/lib/push/send", () => ({
  sendPush: (...args: unknown[]) => sendPush(...args),
  pushIsConfigured: () => true,
}));

vi.mock("@/lib/dowozy/load-schedule", () => ({
  loadScheduleSnapshot: async () => null,
}));

vi.mock("@/lib/push/store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/push/store")>("@/lib/push/store");
  return {
    ...actual,
    getPushRedis: () => ({}),
    getPushRecord: (...args: unknown[]) => getPushRecord(...args),
    savePushRecord: (...args: unknown[]) => savePushRecord(...args),
    deletePushRecord: (...args: unknown[]) => deletePushRecord(...args),
  };
});

const SESSION = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const subscription = {
  endpoint: "https://push.example/device",
  keys: { p256dh: "p256dh-key", auth: "auth-secret" },
};

const plan = {
  place: "Zatonie",
  days: { 1: { start: "08:00", end: "14:00" } },
};

function stored(userId?: string) {
  return {
    subscription,
    plan,
    sentOn: "",
    sent: [] as string[],
    scheduleFingerprint: "",
    kinds: { departure: true, return: true, schedule: true },
    ...(userId ? { userId } : {}),
  };
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function asUser(userId = SESSION) {
  getCurrentUser.mockResolvedValue({ userId, email: "parent@example.com" });
}

function asPlus(userId = SESSION) {
  asUser(userId);
  readEntitlement.mockResolvedValue({ status: "active", validUntil: "2099-08-31" });
}

describe("push Plus gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPushRecord.mockResolvedValue(null);
    savePushRecord.mockResolvedValue(undefined);
    deletePushRecord.mockResolvedValue(undefined);
    sendPush.mockResolvedValue("ok");
  });

  it("refuses subscribe without a session", async () => {
    getCurrentUser.mockResolvedValue(null);

    const response = await subscribe(
      jsonRequest("http://localhost:3000/api/push/subscribe", "POST", {}),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: PUSH_LOGIN_REQUIRED });
    expect(readEntitlement).not.toHaveBeenCalled();
    expect(savePushRecord).not.toHaveBeenCalled();
  });

  it("refuses subscribe without an active Plan Plus", async () => {
    asUser();
    readEntitlement.mockResolvedValue(null);

    const response = await subscribe(
      jsonRequest("http://localhost:3000/api/push/subscribe", "POST", {
        subscription,
        plan,
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: PUSH_PLUS_REQUIRED });
    expect(savePushRecord).not.toHaveBeenCalled();
  });

  it("refuses subscribe when Plan Plus has expired", async () => {
    asUser();
    readEntitlement.mockResolvedValue({ status: "active", validUntil: "2020-08-31" });

    const response = await subscribe(
      jsonRequest("http://localhost:3000/api/push/subscribe", "POST", {
        subscription,
        plan,
      }),
    );

    expect(response.status).toBe(403);
    expect(savePushRecord).not.toHaveBeenCalled();
  });

  it("does not replace another account's endpoint, even when the caller knows the keys", async () => {
    asPlus();
    getPushRecord.mockResolvedValue(stored(OTHER));

    const response = await subscribe(
      jsonRequest("http://localhost:3000/api/push/subscribe", "POST", {
        subscription,
        plan,
        userId: OTHER,
      }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: PUSH_NOT_YOURS });
    expect(savePushRecord).not.toHaveBeenCalled();
  });

  it("does not claim an existing endpoint when only the URL is known", async () => {
    asPlus();
    getPushRecord.mockResolvedValue({
      ...stored(),
      subscription: {
        ...subscription,
        keys: { ...subscription.keys, auth: "other-auth" },
      },
    });

    const response = await subscribe(
      jsonRequest("http://localhost:3000/api/push/subscribe", "POST", {
        subscription,
        plan,
      }),
    );

    expect(response.status).toBe(403);
    expect(savePushRecord).not.toHaveBeenCalled();
  });

  it("stores the session user id and ignores userId from the body", async () => {
    asPlus();

    const response = await subscribe(
      jsonRequest("http://localhost:3000/api/push/subscribe", "POST", {
        subscription,
        plan,
        userId: OTHER,
      }),
    );

    expect(response.status).toBe(200);
    expect(savePushRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: SESSION, subscription, plan }),
    );
  });

  it("refuses plan, kinds, and test writes without a session or Plus", async () => {
    getCurrentUser.mockResolvedValue(null);
    const planResponse = await updatePlan(
      jsonRequest("http://localhost:3000/api/push/plan", "PUT", { subscription, plan }),
    );
    const kindsResponse = await updateKinds(
      jsonRequest("http://localhost:3000/api/push/kinds", "PUT", {
        subscription,
        kinds: { departure: true, return: false, schedule: true },
      }),
    );
    const testResponse = await sendTest(
      jsonRequest("http://localhost:3000/api/push/test", "POST", { subscription }),
    );

    expect(planResponse.status).toBe(401);
    expect(kindsResponse.status).toBe(401);
    expect(testResponse.status).toBe(401);
    expect(savePushRecord).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();

    asUser();
    readEntitlement.mockResolvedValue({ status: "revoked", validUntil: "2099-08-31" });
    const blocked = await updatePlan(
      jsonRequest("http://localhost:3000/api/push/plan", "PUT", { subscription, plan }),
    );
    expect(blocked.status).toBe(403);
    expect(await blocked.json()).toEqual({ error: PUSH_PLUS_REQUIRED });
  });

  it("does not update or test another account's subscription", async () => {
    asPlus();
    getPushRecord.mockResolvedValue(stored(OTHER));

    const planResponse = await updatePlan(
      jsonRequest("http://localhost:3000/api/push/plan", "PUT", { subscription, plan }),
    );
    const testResponse = await sendTest(
      jsonRequest("http://localhost:3000/api/push/test", "POST", { subscription }),
    );

    expect(planResponse.status).toBe(403);
    expect(testResponse.status).toBe(403);
    expect(savePushRecord).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("does not delete another account's subscription", async () => {
    asUser();
    getPushRecord.mockResolvedValue(stored(OTHER));

    const response = await DELETE(
      jsonRequest("http://localhost:3000/api/push/subscribe", "DELETE", { subscription }),
    );

    expect(response.status).toBe(403);
    expect(deletePushRecord).not.toHaveBeenCalled();
  });

  it("deletes the caller's subscription without an active Plan Plus", async () => {
    asUser();
    readEntitlement.mockResolvedValue(null);
    getPushRecord.mockResolvedValue(stored(SESSION));

    const response = await DELETE(
      jsonRequest("http://localhost:3000/api/push/subscribe", "DELETE", { subscription }),
    );

    expect(response.status).toBe(200);
    expect(deletePushRecord).toHaveBeenCalledTimes(1);
  });
});
