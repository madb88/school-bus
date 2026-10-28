import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasOfflineEntitlement,
  loadOfflineEntitlement,
  normalizeValidUntilYmd,
  parseOfflineEntitlement,
  saveOfflineEntitlement,
  syncOfflineEntitlement,
} from "./entitlement";
import { OFFLINE_ENTITLEMENT_KEY } from "./constants";

describe("parseOfflineEntitlement", () => {
  it("accepts valid payload", () => {
    expect(
      parseOfflineEntitlement({
        validUntil: "2027-08-31",
        cachedAt: "2026-10-28T12:00:00.000Z",
      }),
    ).toEqual({
      validUntil: "2027-08-31",
      cachedAt: "2026-10-28T12:00:00.000Z",
    });
  });

  it("rejects bad shapes", () => {
    expect(parseOfflineEntitlement(null)).toBeNull();
    expect(parseOfflineEntitlement({ validUntil: "31.08.2027" })).toBeNull();
  });
});

describe("normalizeValidUntilYmd", () => {
  it("keeps YMD and trims datetime", () => {
    expect(normalizeValidUntilYmd("2027-08-31")).toBe("2027-08-31");
    expect(normalizeValidUntilYmd("2027-08-31T00:00:00Z")).toBe("2027-08-31");
    expect(normalizeValidUntilYmd("nope")).toBeNull();
  });
});

describe("offline entitlement storage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal("window", {
      localStorage: globalThis.localStorage,
      dispatchEvent: () => true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("saves and reports active entitlement", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T10:00:00+02:00"));
    saveOfflineEntitlement("2027-08-31");
    expect(hasOfflineEntitlement(new Date("2026-10-28T10:00:00+02:00"))).toBe(
      true,
    );
    expect(loadOfflineEntitlement()?.validUntil).toBe("2027-08-31");
    expect(store.get(OFFLINE_ENTITLEMENT_KEY)).toBeTruthy();
  });

  it("treats past validUntil as inactive", () => {
    saveOfflineEntitlement("2026-01-01");
    expect(hasOfflineEntitlement(new Date("2026-10-28T10:00:00+02:00"))).toBe(
      false,
    );
  });

  it("clears when plusAccess is false", () => {
    saveOfflineEntitlement("2027-08-31");
    syncOfflineEntitlement({ plusAccess: false });
    expect(loadOfflineEntitlement()).toBeNull();
  });
});
