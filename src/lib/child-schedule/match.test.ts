import { describe, expect, it } from "vitest";
import {
  dropoffFitsLessonEnd,
  formatTimeInput,
  getDayTimes,
  pickupFitsLessonStart,
  timeToMinutes,
} from "./match";
import type { ChildLessonPlan } from "./types";

describe("timeToMinutes", () => {
  it("parses H:MM and HH:MM", () => {
    expect(timeToMinutes("8:00")).toBe(480);
    expect(timeToMinutes("08:00")).toBe(480);
    expect(timeToMinutes("14:30")).toBe(870);
  });

  it("rejects invalid times", () => {
    expect(timeToMinutes("")).toBeNull();
    expect(timeToMinutes("24:00")).toBeNull();
    expect(timeToMinutes("12:60")).toBeNull();
    expect(timeToMinutes("noon")).toBeNull();
  });
});

describe("formatTimeInput", () => {
  it("zero-pads hours", () => {
    expect(formatTimeInput("8:05")).toBe("08:05");
    expect(formatTimeInput("14:00")).toBe("14:00");
  });

  it("returns original string when unparsable", () => {
    expect(formatTimeInput("bad")).toBe("bad");
  });
});

describe("getDayTimes", () => {
  const plan: ChildLessonPlan = {
    place: "Zatonie",
    days: {
      1: { start: "08:00", end: "13:30" },
    },
  };

  it("returns configured weekday times", () => {
    expect(getDayTimes(plan, 1)).toEqual({ start: "08:00", end: "13:30" });
  });

  it("returns undefined for weekend and missing days", () => {
    expect(getDayTimes(plan, 6)).toBeUndefined();
    expect(getDayTimes(plan, 2)).toBeUndefined();
  });
});

describe("pickupFitsLessonStart", () => {
  it("accepts stop within default window before start", () => {
    expect(pickupFitsLessonStart("07:00", "08:00")).toBe(true);
    expect(pickupFitsLessonStart("05:30", "08:00")).toBe(true);
  });

  it("rejects stop at/after start or too early", () => {
    expect(pickupFitsLessonStart("08:00", "08:00")).toBe(false);
    expect(pickupFitsLessonStart("08:10", "08:00")).toBe(false);
    expect(pickupFitsLessonStart("05:29", "08:00")).toBe(false);
  });

  it("respects custom window", () => {
    expect(pickupFitsLessonStart("07:00", "08:00", 30)).toBe(false);
    expect(pickupFitsLessonStart("07:40", "08:00", 30)).toBe(true);
  });
});

describe("dropoffFitsLessonEnd", () => {
  it("accepts run at/after end within window", () => {
    expect(dropoffFitsLessonEnd("13:30", "13:30")).toBe(true);
    expect(dropoffFitsLessonEnd("15:00", "13:30")).toBe(true);
    expect(dropoffFitsLessonEnd("16:00", "13:30")).toBe(true);
  });

  it("rejects run before end or past window", () => {
    expect(dropoffFitsLessonEnd("13:29", "13:30")).toBe(false);
    expect(dropoffFitsLessonEnd("16:01", "13:30")).toBe(false);
  });
});
