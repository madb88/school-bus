import { describe, expect, it } from "vitest";
import {
  dateLabel,
  directionLabel,
  formatTripCount,
  sourceModeLabel,
} from "./labels";

describe("dateLabel", () => {
  it("labels relative and all-days filters", () => {
    expect(dateLabel("today")).toBe("Dziś");
    expect(dateLabel("tomorrow")).toBe("Jutro");
    expect(dateLabel("all")).toBe("Wszystkie dni");
  });

  it("formats absolute YMD", () => {
    expect(dateLabel("2026-09-07")).toBe("Poniedziałek (07.09)");
  });
});

describe("directionLabel", () => {
  it("maps directions", () => {
    expect(directionLabel("pickups")).toBe("Do szkoły");
    expect(directionLabel("dropoffs")).toBe("Ze szkoły");
    expect(directionLabel("all")).toBe("wszystkie kierunki");
  });
});

describe("formatTripCount", () => {
  it("uses Polish plural forms", () => {
    expect(formatTripCount(1)).toBe("1 kurs");
    expect(formatTripCount(2)).toBe("2 kursy");
    expect(formatTripCount(4)).toBe("4 kursy");
    expect(formatTripCount(5)).toBe("5 kursów");
    expect(formatTripCount(0)).toBe("0 kursów");
  });
});

describe("sourceModeLabel", () => {
  it("labels source modes", () => {
    expect(sourceModeLabel("school")).toBe("Autobus szkolny");
    expect(sourceModeLabel("school-mzk")).toBe("Szkolny + MZK");
  });
});
