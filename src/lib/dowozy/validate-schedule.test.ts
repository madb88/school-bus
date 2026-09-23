import { describe, expect, it } from "vitest";
import { isScheduleSnapshot } from "./validate-schedule";

describe("isScheduleSnapshot", () => {
  it("accepts a minimal valid shape", () => {
    expect(
      isScheduleSnapshot({
        fetchedAt: "2026-09-22T10:00:00.000Z",
        pickups: [],
        dropoffsByDate: [],
        dropoffsWeekday: [],
      }),
    ).toBe(true);
  });

  it("rejects corrupt payloads", () => {
    expect(isScheduleSnapshot(null)).toBe(false);
    expect(isScheduleSnapshot({ fetchedAt: "x" })).toBe(false);
    expect(isScheduleSnapshot("{not json object}")).toBe(false);
  });
});
