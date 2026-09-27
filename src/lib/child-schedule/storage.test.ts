import { describe, expect, it } from "vitest";
import {
  hasConfiguredLessons,
  parseLessonPlan,
} from "./storage";
import { EMPTY_LESSON_PLAN } from "./types";

describe("parseLessonPlan", () => {
  it("returns empty plan for invalid input", () => {
    expect(parseLessonPlan(null)).toEqual({ ...EMPTY_LESSON_PLAN, days: {} });
    expect(parseLessonPlan("x")).toEqual({ ...EMPTY_LESSON_PLAN, days: {} });
    expect(parseLessonPlan(42)).toEqual({ ...EMPTY_LESSON_PLAN, days: {} });
  });

  it("parses place and weekday times", () => {
    const plan = parseLessonPlan({
      place: "  Zatonie  ",
      days: {
        "1": { start: "8:00", end: "14:00" },
        "2": { start: "09:15" },
        "9": { start: "10:00" },
        "3": { start: "bad" },
      },
    });

    expect(plan.place).toBe("Zatonie");
    expect(plan.days[1]).toEqual({ start: "8:00", end: "14:00" });
    expect(plan.days[2]).toEqual({ start: "09:15" });
    expect(plan.days[3]).toBeUndefined();
    expect(plan.days[9 as 1]).toBeUndefined();
  });

  it("ignores blank place", () => {
    expect(parseLessonPlan({ place: "   ", days: {} }).place).toBeNull();
  });
});

describe("hasConfiguredLessons", () => {
  it("is true only when at least one day is set", () => {
    expect(hasConfiguredLessons({ place: null, days: {} })).toBe(false);
    expect(
      hasConfiguredLessons({
        place: "X",
        days: { 1: { start: "08:00" } },
      }),
    ).toBe(true);
  });
});
