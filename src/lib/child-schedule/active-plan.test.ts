import { describe, expect, it } from "vitest";
import {
  buildPlanChoices,
  findPlanChoice,
  LOCAL_PLAN_KEY,
  resolveActivePlanKey,
} from "./active-plan";
import type { AccountPlan } from "./account-plan";
import { EMPTY_MZK_ROUTE } from "@/lib/mzk/route-preference";

const SEED = "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680";
const OTHER = "11111111-2222-4333-8444-555555555555";
const A = "550e8400-e29b-41d4-a716-446655440000";
const B = "660e8400-e29b-41d4-a716-446655440000";
const ROUTE = { boardStopId: "350", alightStopId: "299", route: "30" };

const accountPlans: AccountPlan[] = [
  {
    id: A,
    schoolId: SEED,
    place: "Zatonie",
    name: "Ania",
    days: { "1": { start: "08:00", end: "14:00" } },
    mzkRoute: ROUTE,
  },
  {
    id: B,
    schoolId: OTHER,
    place: "Ochla",
    days: { "2": { start: "09:00", end: "15:00" } },
  },
];

const localPlan = {
  place: "Zatonie",
  days: { 1: { start: "08:00", end: "14:00" } },
};

describe("buildPlanChoices", () => {
  it("lists account plans with their school and route", () => {
    const choices = buildPlanChoices(accountPlans, localPlan, EMPTY_MZK_ROUTE);
    expect(choices.map((choice) => choice.key)).toEqual([A, B]);
    expect(choices[0]).toMatchObject({
      label: "Ania",
      schoolId: SEED,
      mzkRoute: { boardStopId: "350", alightStopId: "299", route: "30" },
    });
    expect(choices[1]).toMatchObject({
      label: "Ochla",
      schoolId: OTHER,
      mzkRoute: EMPTY_MZK_ROUTE,
    });
  });

  it("falls back to the device plan and its school's route", () => {
    const local = { ...localPlan, schoolId: OTHER };
    const route = { ...EMPTY_MZK_ROUTE, ...ROUTE, schoolId: OTHER };
    const [choice] = buildPlanChoices([], local, route);
    expect(choice).toMatchObject({
      key: LOCAL_PLAN_KEY,
      schoolId: OTHER,
      account: null,
      mzkRoute: { boardStopId: "350", alightStopId: "299" },
    });
  });

  it("ignores a device route set for another school", () => {
    const route = { ...EMPTY_MZK_ROUTE, ...ROUTE, schoolId: OTHER };
    const [choice] = buildPlanChoices([], localPlan, route);
    expect(choice?.schoolId).toBe(SEED);
    expect(choice?.mzkRoute).toEqual(EMPTY_MZK_ROUTE);
  });

  it("is empty without plans", () => {
    expect(
      buildPlanChoices([], { place: null, days: {} }, EMPTY_MZK_ROUTE),
    ).toEqual([]);
  });
});

describe("resolveActivePlanKey", () => {
  const choices = buildPlanChoices(accountPlans, localPlan, EMPTY_MZK_ROUTE);

  it("prefers the URL, then the remembered plan, then the first", () => {
    expect(resolveActivePlanKey(choices, { kind: "plan", key: B }, A)).toBe(B);
    expect(resolveActivePlanKey(choices, { kind: "default" }, B)).toBe(B);
    expect(resolveActivePlanKey(choices, { kind: "default" }, null)).toBe(A);
    expect(
      resolveActivePlanKey(choices, { kind: "plan", key: "gone" }, null),
    ).toBe(A);
  });

  it("maps legacy index links and honours off", () => {
    expect(resolveActivePlanKey(choices, { kind: "index", index: 1 }, null)).toBe(
      B,
    );
    expect(resolveActivePlanKey(choices, { kind: "off" }, A)).toBeNull();
    expect(resolveActivePlanKey([], { kind: "default" }, A)).toBeNull();
  });

  it("finds a choice by key", () => {
    expect(findPlanChoice(choices, B)?.schoolId).toBe(OTHER);
    expect(findPlanChoice(choices, null)).toBeNull();
  });
});
