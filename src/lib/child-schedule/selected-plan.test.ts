import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AccountPlan } from "./account-plan";
import {
  indexOfPlanId,
  loadSelectedPlanId,
  reconcileSelectedPlanId,
  resolveSelectedPlanId,
  saveSelectedPlanId,
  SELECTED_PLAN_STORAGE_KEY,
} from "./selected-plan";

const ID_A = "550e8400-e29b-41d4-a716-446655440000";
const ID_B = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function plan(id: string, place = "Zatonie"): AccountPlan {
  return {
    id,
    place,
    days: { "1": { start: "08:00", end: "14:00" } },
  };
}

describe("resolveSelectedPlanId", () => {
  const plans = [plan(ID_A, "A"), plan(ID_B, "B")];

  it("keeps a matching id", () => {
    expect(resolveSelectedPlanId(plans, ID_B)).toBe(ID_B);
  });

  it("falls back to the first plan when the id is gone", () => {
    expect(
      resolveSelectedPlanId(plans, "11111111-1111-1111-1111-111111111111"),
    ).toBe(ID_A);
  });

  it("migrates a legacy numeric index", () => {
    expect(resolveSelectedPlanId(plans, "1")).toBe(ID_B);
    expect(resolveSelectedPlanId(plans, "0")).toBe(ID_A);
  });

  it("returns null when no plans have ids", () => {
    expect(
      resolveSelectedPlanId(
        [{ place: "X", days: { "1": { start: "08:00", end: "14:00" } } }],
        "0",
      ),
    ).toBeNull();
  });
});

describe("reconcileSelectedPlanId / indexOfPlanId", () => {
  it("reconciles after delete and finds index by id", () => {
    const remaining = [plan(ID_B)];
    expect(reconcileSelectedPlanId(remaining, ID_A)).toBe(ID_B);
    expect(indexOfPlanId([plan(ID_A), plan(ID_B)], ID_B)).toBe(1);
  });
});

describe("loadSelectedPlanId / saveSelectedPlanId", () => {
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
    vi.unstubAllGlobals();
  });

  it("persists an id and migrates a legacy index in storage", () => {
    const plans = [plan(ID_A), plan(ID_B)];
    store.set(SELECTED_PLAN_STORAGE_KEY, "1");
    expect(loadSelectedPlanId(plans)).toBe(ID_B);
    expect(store.get(SELECTED_PLAN_STORAGE_KEY)).toBe(ID_B);

    saveSelectedPlanId(ID_A);
    expect(store.get(SELECTED_PLAN_STORAGE_KEY)).toBe(ID_A);
    expect(loadSelectedPlanId(plans)).toBe(ID_A);
  });
});
