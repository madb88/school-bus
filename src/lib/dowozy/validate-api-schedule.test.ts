import { describe, expect, it } from "vitest";
import {
  isDowozyApiModified,
  isDowozyApiScheduleResponse,
} from "./validate-api-schedule";

const validSchedule = {
  sourceUrl: "https://example.test",
  fetchedAt: "2026-10-05T07:33:40.131Z",
  title: "Test",
  periodLabel: "",
  pickups: [],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

describe("isDowozyApiModified", () => {
  it("accepts inactive without schedule", () => {
    expect(isDowozyApiModified({ active: false })).toBe(true);
  });

  it("accepts active with schedule and activeUntil", () => {
    expect(
      isDowozyApiModified({
        active: true,
        activeUntil: "2026-10-06",
        schedule: validSchedule,
      }),
    ).toBe(true);
  });

  it("rejects invalid activeUntil", () => {
    expect(
      isDowozyApiModified({
        active: true,
        activeUntil: "06.10.2026",
        schedule: validSchedule,
      }),
    ).toBe(false);
  });
});

describe("isDowozyApiScheduleResponse", () => {
  it("accepts original + modified wrapper", () => {
    expect(
      isDowozyApiScheduleResponse({
        original: validSchedule,
        modified: { active: false },
      }),
    ).toBe(true);
  });

  it("rejects bare schedule without wrapper", () => {
    expect(isDowozyApiScheduleResponse(validSchedule)).toBe(false);
  });

  it("rejects missing original", () => {
    expect(
      isDowozyApiScheduleResponse({
        modified: { active: false },
      }),
    ).toBe(false);
  });
});
