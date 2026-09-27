import { describe, expect, it } from "vitest";
import { isMzkScheduleSnapshot } from "./validate-schedule";

describe("isMzkScheduleSnapshot", () => {
  it("accepts a minimal valid shape", () => {
    expect(
      isMzkScheduleSnapshot({
        fetchedAt: "2026-09-22T10:00:00.000Z",
        feedEndDate: "20261231",
        stops: [],
        trips: [],
        serviceDates: {},
      }),
    ).toBe(true);
  });

  it("rejects corrupt payloads", () => {
    expect(isMzkScheduleSnapshot(null)).toBe(false);
    expect(isMzkScheduleSnapshot("x")).toBe(false);
    expect(
      isMzkScheduleSnapshot({
        fetchedAt: "x",
        stops: [],
        trips: [],
      }),
    ).toBe(false);
    expect(
      isMzkScheduleSnapshot({
        fetchedAt: "2026-09-22T10:00:00.000Z",
        feedEndDate: "20261231",
        stops: [],
        trips: [],
        serviceDates: null,
      }),
    ).toBe(false);
  });
});
