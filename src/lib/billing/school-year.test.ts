import { describe, expect, it } from "vitest";
import {
  formatPolishYmd,
  formatRemainingMonthsLabel,
  isActiveUntil,
  nextPlusValidUntil,
  plusValidUntil,
  remainingWholeMonths,
} from "./school-year";

describe("plus school year", () => {
  it("keeps a September purchase until 31 August of the next calendar year", () => {
    expect(plusValidUntil(new Date("2026-08-31T22:30:00.000Z"))).toBe("2027-08-31");
    expect(formatPolishYmd("2027-08-31")).toBe("31 sierpnia 2027");
  });

  it("keeps 1 January through 30 June until 31 August of that year", () => {
    expect(plusValidUntil(new Date("2027-01-15T12:00:00.000Z"))).toBe("2027-08-31");
    expect(plusValidUntil(new Date("2027-06-30T21:30:00.000Z"))).toBe("2027-08-31");
  });

  it("extends a July or August purchase to 31 August of the following year", () => {
    expect(plusValidUntil(new Date("2027-06-30T22:30:00.000Z"))).toBe("2028-08-31");
    expect(plusValidUntil(new Date("2026-08-31T16:00:00.000Z"))).toBe("2027-08-31");
  });

  it("adds another 31 August when Plus is still active", () => {
    const active = { status: "active" as const, validUntil: "2027-08-31" };
    expect(nextPlusValidUntil(new Date("2026-10-01T10:00:00.000Z"), active)).toBe(
      "2028-08-31",
    );
    expect(nextPlusValidUntil(new Date("2027-09-02T10:00:00.000Z"), active)).toBe(
      "2028-08-31",
    );
    expect(nextPlusValidUntil(new Date("2026-10-01T10:00:00.000Z"), null)).toBe(
      "2027-08-31",
    );
  });

  it("stays active through the Warsaw end date", () => {
    expect(isActiveUntil("2027-08-31", new Date("2027-08-31T21:00:00.000Z"))).toBe(true);
    expect(isActiveUntil("2027-08-31", new Date("2027-08-31T22:30:00.000Z"))).toBe(false);
  });

  it("counts whole months left until validUntil", () => {
    expect(remainingWholeMonths("2027-08-31", new Date("2026-09-30T10:00:00.000Z"))).toBe(11);
    expect(formatRemainingMonthsLabel("2027-08-31", new Date("2026-09-30T10:00:00.000Z"))).toBe(
      "11 miesięcy",
    );
    expect(formatRemainingMonthsLabel("2026-10-31", new Date("2026-09-30T10:00:00.000Z"))).toBe(
      "1 miesiąc",
    );
    expect(formatRemainingMonthsLabel("2026-09-30", new Date("2026-09-15T10:00:00.000Z"))).toBe(
      "mniej niż miesiąc",
    );
  });
});
