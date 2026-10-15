import { describe, expect, it } from "vitest";
import {
  formatPolishYmd,
  formatRemainingMonthsLabel,
  remainingWholeMonths,
} from "./format";

describe("plus date labels", () => {
  it("formats a YMD date in Polish", () => {
    expect(formatPolishYmd("2027-08-31")).toBe("31 sierpnia 2027");
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
