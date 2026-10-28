import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSON_PLAN_STORAGE_KEY } from "@/lib/child-schedule/types";
import { SELECTED_PLAN_STORAGE_KEY } from "@/lib/child-schedule/selected-plan";
import { MZK_ROUTE_STORAGE_KEY } from "@/lib/mzk/route-preference";
import { OFFLINE_ENTITLEMENT_KEY } from "./constants";
import { hasOfflineEntitlement, loadOfflineEntitlement } from "./entitlement";

const saveSchool = vi.fn<(input?: unknown) => Promise<void>>(async () => undefined);
const clearSchool = vi.fn(async () => undefined);

vi.mock("./school-cache", () => ({
  saveSchoolOfflineSnapshot: (input: unknown) => saveSchool(input),
  clearSchoolOfflineSnapshot: () => clearSchool(),
}));

vi.mock("./warm-shell", () => ({
  OFFLINE_SHELL_CACHE: "school-bus-shell-test",
  OFFLINE_WARM_DOCUMENT_PATHS: ["/", "/offline", "/offline.html", "/lekcje"],
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

  it("does not renew entitlement when persist runs offline", async () => {
    store.set(
      OFFLINE_ENTITLEMENT_KEY,
      JSON.stringify({
        validUntil: "2026-11-01",
        cachedAt: "2026-10-20T10:00:00.000Z",
      }),
    );

    const { persistOfflinePlusSession } = await import("./clear-session");
    await persistOfflinePlusSession({
      validUntil: null,
      schedule,
      online: false,
    });

    expect(loadOfflineEntitlement()?.validUntil).toBe("2026-11-01");
    expect(saveSchool).not.toHaveBeenCalled();
  });

  it("clears user local settings without touching theme", async () => {
    store.set(LESSON_PLAN_STORAGE_KEY, "{}");
    store.set(SELECTED_PLAN_STORAGE_KEY, "plan-id");
    store.set(MZK_ROUTE_STORAGE_KEY, "{}");
    store.set("school-bus-theme", "dark");

    const { clearUserLocalSettings } = await import("./clear-session");
    clearUserLocalSettings();

    expect(store.has(LESSON_PLAN_STORAGE_KEY)).toBe(false);
    expect(store.has(SELECTED_PLAN_STORAGE_KEY)).toBe(false);
    expect(store.has(MZK_ROUTE_STORAGE_KEY)).toBe(false);
    expect(store.get("school-bus-theme")).toBe("dark");
  });
});
