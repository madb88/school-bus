import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_PLAN_NAME_MAX,
  accountPlanLabel,
  fromAccountPlan,
  parseAccountPlan,
  parseAccountPlans,
  serializeAccountPlan,
  toAccountPlan,
  type AccountPlan,
} from "./account-plan";
import type { ChildLessonPlan } from "./types";

describe("toAccountPlan", () => {
  it("returns null without a place or full days", () => {
    expect(toAccountPlan({ place: null, days: { 1: { start: "08:00", end: "14:00" } } })).toEqual({
      plan: null,
      droppedDaysWithoutEnd: [],
    });
    expect(toAccountPlan({ place: "Zatonie", days: { 1: { start: "08:00" } } })).toEqual({
      plan: null,
      droppedDaysWithoutEnd: [1],
    });
  });

  it("pads times and drops days without end", () => {
    const result = toAccountPlan({
      place: " Zatonie ",
      days: {
        1: { start: "8:00", end: "14:00" },
        2: { start: "08:00" },
        3: { start: "09:00", end: "15:30" },
      },
    });
    expect(result.droppedDaysWithoutEnd).toEqual([2]);
    expect(result.plan).toEqual({
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Zatonie",
      days: {
        "1": { start: "08:00", end: "14:00" },
        "3": { start: "09:00", end: "15:30" },
      },
    });
  });

  it("skips days where end is equal to or before start", () => {
    expect(
      toAccountPlan({
        place: "Zatonie",
        days: {
          1: { start: "08:00", end: "08:00" },
          2: { start: "14:00", end: "08:00" },
          3: { start: "08:00", end: "14:00" },
        },
      }),
    ).toEqual({
      plan: {
        schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
        place: "Zatonie",
        days: { "3": { start: "08:00", end: "14:00" } },
      },
      droppedDaysWithoutEnd: [],
    });
    expect(
      toAccountPlan({
        place: "Zatonie",
        days: { 1: { start: "08:00", end: "08:00" } },
      }),
    ).toEqual({ plan: null, droppedDaysWithoutEnd: [] });
  });

  it("merges optional name", () => {
    const { plan } = toAccountPlan(
      { place: "Złote Piaski", days: { 1: { start: "08:00", end: "14:00" } } },
      { name: " Ania " },
    );
    expect(plan).toEqual({
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Złote Piaski",
      name: "Ania",
      days: { "1": { start: "08:00", end: "14:00" } },
    });
  });

  it("preserves existing id and omits id for a new plan", () => {
    const existing: AccountPlan = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Zatonie",
      days: { "1": { start: "08:00", end: "14:00" } },
    };
    const { plan: edited } = toAccountPlan(
      { place: "Ochla", days: { 1: { start: "09:00", end: "15:00" } } },
      { name: "Ania", existing },
    );
    expect(edited).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Ochla",
      name: "Ania",
      days: { "1": { start: "09:00", end: "15:00" } },
    });

    const { plan: created } = toAccountPlan({
      place: "Ochla",
      days: { 1: { start: "09:00", end: "15:00" } },
    });
    expect(created).toEqual({
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Ochla",
      days: { "1": { start: "09:00", end: "15:00" } },
    });
    expect(created).not.toHaveProperty("id");
  });
});

describe("toAccountPlan school and MZK route", () => {
  const OTHER_SCHOOL = "11111111-2222-4333-8444-555555555555";
  const ROUTE = { boardStopId: "350", alightStopId: "299", route: "30" };
  const existing: AccountPlan = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    schoolId: OTHER_SCHOOL,
    place: "Zatonie",
    days: { "1": { start: "08:00", end: "14:00" } },
    mzkRoute: ROUTE,
  };
  const local: ChildLessonPlan = {
    place: "Zatonie",
    days: { 1: { start: "08:00", end: "14:00" } },
  };

  it("keeps the edited plan's school and route when none is given", () => {
    const { plan } = toAccountPlan(local, { existing });
    expect(plan?.schoolId).toBe(OTHER_SCHOOL);
    expect(plan?.mzkRoute).toEqual(ROUTE);
  });

  it("uses the picked school and clears the route with null", () => {
    const { plan } = toAccountPlan(local, {
      existing,
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      mzkRoute: null,
    });
    expect(plan?.schoolId).toBe("2d6cdca6-4dc0-4cfc-b5a0-8286ac813680");
    expect(plan).not.toHaveProperty("mzkRoute");
  });

  it("takes a device plan's own school", () => {
    const { plan } = toAccountPlan({ ...local, schoolId: OTHER_SCHOOL });
    expect(plan?.schoolId).toBe(OTHER_SCHOOL);
  });
});

describe("parseAccountPlan mzkRoute", () => {
  const base = {
    schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
    place: "Zatonie",
    days: { "1": { start: "08:00", end: "14:00" } },
  };

  it("keeps a valid route and drops an invalid one", () => {
    expect(
      parseAccountPlan({
        ...base,
        mzkRoute: { boardStopId: " 350 ", alightStopId: "299", route: "" },
      })?.mzkRoute,
    ).toEqual({ boardStopId: "350", alightStopId: "299" });
    expect(
      parseAccountPlan({
        ...base,
        mzkRoute: { boardStopId: "350", alightStopId: "350" },
      }),
    ).not.toHaveProperty("mzkRoute");
  });

  it("serializes the route", () => {
    expect(
      serializeAccountPlan({
        ...base,
        mzkRoute: { boardStopId: "350", alightStopId: "299", route: "30" },
      }).mzkRoute,
    ).toEqual({ boardStopId: "350", alightStopId: "299", route: "30" });
  });
});

describe("fromAccountPlan", () => {
  it("uses numeric weekday keys, keeps the school and ignores name", () => {
    const account: AccountPlan = {
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Zatonie",
      name: "Ania",
      days: { "1": { start: "08:00", end: "14:00" } },
    };
    expect(fromAccountPlan(account)).toEqual({
      place: "Zatonie",
      days: { 1: { start: "08:00", end: "14:00" } },
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
    });
  });
});

describe("account plan round trip", () => {
  it("survives toAccountPlan → fromAccountPlan", () => {
    const local: ChildLessonPlan = {
      place: "Ochla",
      days: {
        1: { start: "8:05", end: "13:00" },
        5: { start: "09:00", end: "14:30" },
      },
    };
    const { plan } = toAccountPlan(local);
    expect(plan).not.toBeNull();
    expect(plan?.schoolId).toBe("2d6cdca6-4dc0-4cfc-b5a0-8286ac813680");
    expect(fromAccountPlan(plan!)).toEqual({
      place: "Ochla",
      days: {
        1: { start: "08:05", end: "13:00" },
        5: { start: "09:00", end: "14:30" },
      },
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
    });
  });
});

describe("parseAccountPlan name", () => {
  it("keeps a trimmed name and omits empty", () => {
    expect(
      parseAccountPlan({
        schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
        place: "Złote Piaski",
        name: " Ania ",
        days: { "1": { start: "08:00", end: "14:00" } },
      }),
    ).toEqual({
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Złote Piaski",
      name: "Ania",
      days: { "1": { start: "08:00", end: "14:00" } },
    });
    expect(
      parseAccountPlan({
        schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
        place: "Złote Piaski",
        name: "   ",
        days: { "1": { start: "08:00", end: "14:00" } },
      }),
    ).toEqual({
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Złote Piaski",
      days: { "1": { start: "08:00", end: "14:00" } },
    });
  });

  it("rejects names longer than 80", () => {
    expect(
      parseAccountPlan({
        schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
        place: "Zatonie",
        name: "x".repeat(ACCOUNT_PLAN_NAME_MAX + 1),
        days: { "1": { start: "08:00", end: "14:00" } },
      }),
    ).toBeNull();
  });

  it("keeps a valid id and rejects a non-UUID id", () => {
    expect(
      parseAccountPlan({
        id: "550e8400-e29b-41d4-a716-446655440000",
        schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
        place: "Zatonie",
        days: { "1": { start: "08:00", end: "14:00" } },
      }),
    ).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Zatonie",
      days: { "1": { start: "08:00", end: "14:00" } },
    });
    expect(
      parseAccountPlan({
        id: "not-a-uuid",
        schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
        place: "Zatonie",
        days: { "1": { start: "08:00", end: "14:00" } },
      }),
    ).toBeNull();
  });
});

describe("serializeAccountPlan", () => {
  it("omits empty name and echoes id when present", () => {
    expect(
      serializeAccountPlan({
        schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
        place: "Zatonie",
        name: "  ",
        days: { "1": { start: "08:00", end: "14:00" } },
      }),
    ).toEqual({
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Zatonie",
      days: { "1": { start: "08:00", end: "14:00" } },
    });
    expect(
      serializeAccountPlan({
        id: "550e8400-e29b-41d4-a716-446655440000",
        schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
        place: "Zatonie",
        days: { "1": { start: "08:00", end: "14:00" } },
      }),
    ).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Zatonie",
      days: { "1": { start: "08:00", end: "14:00" } },
    });
  });
});

describe("accountPlanLabel", () => {
  it("prefers name, then place, then Plan N", () => {
    expect(
      accountPlanLabel(
        {
          schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
          place: "Zatonie",
          name: "Ania",
          days: { "1": { start: "08:00", end: "14:00" } },
        },
        0,
      ),
    ).toBe("Ania");
    expect(
      accountPlanLabel(
        {
          schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
          place: "Zatonie",
          days: { "1": { start: "08:00", end: "14:00" } },
        },
        1,
      ),
    ).toBe("Zatonie");
    expect(accountPlanLabel({ schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680", place: "", days: { "1": { start: "08:00", end: "14:00" } } }, 2)).toBe(
      "Plan 3",
    );
  });
});

describe("parseAccountPlans", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts an empty list and skips invalid items", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(parseAccountPlans([])).toEqual([]);
    expect(parseAccountPlans([{ place: "X", days: {} }])).toEqual([]);
    expect(parseAccountPlans("not-an-array")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("keeps valid plans when one sibling is invalid", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const valid = {
      schoolId: "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680",
      place: "Zatonie",
      days: { "1": { start: "08:00", end: "14:00" } },
    };
    expect(parseAccountPlans([valid, { place: "X", days: {} }, null])).toEqual([
      valid,
    ]);
  });
});
