import { describe, expect, it } from "vitest";
import {
  courseAllowedOnWeekday,
  dateLabelMatchesTarget,
  extractYearFromPeriod,
  isSchoolDay,
  parsePolishDateLabel,
} from "./schedule-dates";

describe("extractYearFromPeriod", () => {
  it("reads the year from a period label", () => {
    expect(extractYearFromPeriod("wrzesień 2026")).toBe(2026);
  });
});

describe("parsePolishDateLabel", () => {
  it("parses weekday + day + month", () => {
    expect(parsePolishDateLabel("Poniedziałek, 7 września", 2026)).toEqual({
      year: 2026,
      month: 8,
      day: 7,
      weekdayName: "Poniedziałek",
    });
  });

  it("returns null for garbage", () => {
    expect(parsePolishDateLabel("bez daty", 2026)).toBeNull();
  });
});

describe("dateLabelMatchesTarget", () => {
  const tuesday = { year: 2026, month: 8, day: 8, weekday: 2 };

  it("matches exact calendar date", () => {
    expect(
      dateLabelMatchesTarget("Wtorek, 8 września", tuesday, 2026),
    ).toBe(true);
  });

  it("falls back to weekday name when the posted week is a template", () => {
    expect(
      dateLabelMatchesTarget("Wtorek, 1 września", tuesday, 2026),
    ).toBe(true);
  });

  it("rejects a different weekday name", () => {
    expect(
      dateLabelMatchesTarget("Środa, 9 września", tuesday, 2026),
    ).toBe(false);
  });
});

describe("courseAllowedOnWeekday", () => {
  it("allows every weekday when note is empty", () => {
    expect(courseAllowedOnWeekday(undefined, 5)).toBe(true);
  });

  it("limits poniedziałek–czwartek notes", () => {
    expect(
      courseAllowedOnWeekday("od poniedziałku do czwartku", 4),
    ).toBe(true);
    expect(
      courseAllowedOnWeekday("od poniedziałku do czwartku", 5),
    ).toBe(false);
  });

  it("keeps mon–fri notes on school days only", () => {
    expect(
      courseAllowedOnWeekday("od poniedziałku do piątku", 5),
    ).toBe(true);
    expect(
      courseAllowedOnWeekday("od poniedziałku do piątku", 6),
    ).toBe(false);
  });
});

describe("isSchoolDay", () => {
  it("is true Mon–Fri", () => {
    expect(isSchoolDay(1)).toBe(true);
    expect(isSchoolDay(5)).toBe(true);
    expect(isSchoolDay(0)).toBe(false);
    expect(isSchoolDay(6)).toBe(false);
  });
});
