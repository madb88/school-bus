import { describe, expect, it } from "vitest";
import type { Kv } from "@/lib/redis/kv";
import { BILLING_RETURN_VALUE, billingReturnKey, entitlementKey } from "./constants";
import { loadPlusPanel, plusPanelState } from "./status";

const USER = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-09-30T10:00:00.000Z");

class MemoryKv implements Kv {
  private values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    if (!this.values.has(key)) return null;
    return structuredClone(this.values.get(key)) as T;
  }

  async set(key: string, value: unknown, opts?: { ex: number } | { nx: true }) {
    if (opts && "nx" in opts && this.values.has(key)) return null;
    this.values.set(key, structuredClone(value));
    return "OK";
  }

  async getdel<T>(key: string): Promise<T | null> {
    const value = await this.get<T>(key);
    this.values.delete(key);
    return value;
  }

  async del(...keys: string[]) {
    for (const key of keys) this.values.delete(key);
  }

  async sadd() {}

  async expire() {
    return 1;
  }

  async incr() {
    return 1;
  }
}

describe("plus panel state", () => {
  it("treats a paid return without entitlement as in progress", () => {
    expect(
      plusPanelState({
        entitlement: null,
        paidReturn: true,
        pending: false,
        now: NOW,
      }),
    ).toEqual({ state: "pending" });
  });

  it("shows an active plan instead of the paid-return flag", () => {
    expect(
      plusPanelState({
        entitlement: { status: "active", validUntil: "2027-08-31" },
        paidReturn: true,
        pending: true,
        now: NOW,
      }),
    ).toEqual({
      state: "active",
      validUntil: "2027-08-31",
      validUntilLabel: "31 sierpnia 2027",
    });
  });

  it("keeps the in-progress flag across a later visit and clears it once Plus is active", async () => {
    const kv = new MemoryKv();
    await kv.set(billingReturnKey(USER), BILLING_RETURN_VALUE);
    expect(await loadPlusPanel(USER, false, NOW, kv)).toEqual({ state: "pending" });

    await kv.set(entitlementKey(USER), {
      status: "active",
      validUntil: "2027-08-31",
      stripePaymentIntentId: "pi_3TestOrder1001aa",
    });
    expect(await loadPlusPanel(USER, false, NOW, kv)).toEqual({
      state: "active",
      validUntil: "2027-08-31",
      validUntilLabel: "31 sierpnia 2027",
    });
    expect(await kv.get(billingReturnKey(USER))).toBeNull();
  });
});
