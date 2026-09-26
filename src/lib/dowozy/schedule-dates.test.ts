import { describe, expect, it } from "vitest";
import {
  courseAllowedOnWeekday,
  dateLabelMatchesTarget,
  extractYearFromPeriod,
  formatDayOptionLabel,
  isAbsoluteDateFilter,
  isSchoolDay,
  listUpcomingSchoolDays,
  nextMonday,
  parseAbsoluteYmd,
  parsePolishDateLabel,
  resolveTargetDay,
  toAbsoluteYmd,
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

describe("absolute date filters", () => {
  it("parses and validates YYYY-MM-DD", () => {
    expect(parseAbsoluteYmd("2026-09-28")).toBe("2026-09-28");
    expect(parseAbsoluteYmd("2026-02-30")).toBeNull();
    expect(isAbsoluteDateFilter("2026-09-28")).toBe(true);
    expect(isAbsoluteDateFilter("tomorrow")).toBe(false);
  });

  it("resolves an absolute filter to calendar parts", () => {
    expect(resolveTargetDay("2026-09-28")).toEqual({
      year: 2026,
      month: 8,
      day: 28,
      weekday: 1,
    });
  });

  it("finds next Monday from Saturday", () => {
    const monday = nextMonday(new Date("2026-09-26T12:00:00+02:00"));
    expect(toAbsoluteYmd(monday)).toBe("2026-09-28");
    expect(formatDayOptionLabel(monday)).toBe("Poniedziałek (28.09)");
  });

  it("lists upcoming school days skipping the weekend", () => {
    const days = listUpcomingSchoolDays(
      new Date("2026-09-26T12:00:00+02:00"),
      5,
    );
    expect(days.map((d) => d.ymd)).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
    expect(days[0]?.label).toBe("Poniedziałek (28.09)");
  });
});
