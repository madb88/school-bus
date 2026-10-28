import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OFFLINE_ENTITLEMENT_KEY } from "./constants";
import { hasOfflineEntitlement, loadOfflineEntitlement } from "./entitlement";

const saveSchool = vi.fn(async () => undefined);
const clearSchool = vi.fn(async () => undefined);

vi.mock("./school-cache", () => ({
  saveSchoolOfflineSnapshot: (...args: unknown[]) => saveSchool(...args),
  clearSchoolOfflineSnapshot: (...args: unknown[]) => clearSchool(...args),
}));

vi.mock("./warm-shell", () => ({
  OFFLINE_SHELL_CACHE: "school-bus-shell-test",
  warmOfflineShell: vi.fn(),
}));

vi.mock("./prefetch-mzk-od", () => ({
  prefetchMzkOdForRoute: vi.fn(async () => undefined),
}));

vi.mock("@/lib/mzk/route-storage", () => ({
  hasConfiguredMzkRoute: () => false,
  loadMzkRoutePreference: () => ({
    boardStopId: null,
    alightStopId: null,
    route: null,
  }),
}));

const schedule = {
  sourceUrl: "https://example.test/",
  fetchedAt: "2026-10-28T08:00:00.000Z",
  title: "Test",
  periodLabel: "2026/2027",
  pickups: [],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

describe("offline session queue", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    saveSchool.mockClear();
    clearSchool.mockClear();
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
    vi.stubGlobal("caches", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("applies persist after an in-flight clear so re-login keeps offline Plus", async () => {
    let releaseClear!: () => void;
    const clearGate = new Promise<void>((resolve) => {
      releaseClear = resolve;
    });
    clearSchool.mockImplementationOnce(async () => {
      await clearGate;
    });

    const { clearOfflinePlusSession, persistOfflinePlusSession } =
      await import("./clear-session");

    const clearPromise = clearOfflinePlusSession();
    const persistPromise = persistOfflinePlusSession({
      validUntil: "2027-08-31",
      schedule,
      online: true,
    });

    releaseClear();
    await Promise.all([clearPromise, persistPromise]);

    expect(loadOfflineEntitlement()?.validUntil).toBe("2027-08-31");
    expect(hasOfflineEntitlement(new Date("2026-10-28T10:00:00+02:00"))).toBe(
      true,
    );
    expect(store.get(OFFLINE_ENTITLEMENT_KEY)).toBeTruthy();
    expect(saveSchool).toHaveBeenCalled();
  });
});
