import { describe, expect, it } from "vitest";
import { isWithinPushDispatchHours } from "./dispatch-window";

describe("isWithinPushDispatchHours", () => {
  it("includes 06:00 and 16:59 Europe/Warsaw", () => {
    expect(isWithinPushDispatchHours(new Date("2026-09-28T06:00:00+02:00"))).toBe(
      true,
    );
    expect(isWithinPushDispatchHours(new Date("2026-09-28T16:59:00+02:00"))).toBe(
      true,
    );
  });

  it("excludes 05:59 and 17:00 Europe/Warsaw", () => {
    expect(isWithinPushDispatchHours(new Date("2026-09-28T05:59:00+02:00"))).toBe(
      false,
    );
    expect(isWithinPushDispatchHours(new Date("2026-09-28T17:00:00+02:00"))).toBe(
      false,
    );
  });
});
