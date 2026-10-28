import { describe, expect, it } from "vitest";
import { parseSchoolOfflineSnapshot } from "./school-cache";

const schedule = {
  sourceUrl: "https://example.test/dowozy/",
  fetchedAt: "2026-10-28T08:00:00.000Z",
  title: "Test",
  periodLabel: "2026/2027",
  pickups: [],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

describe("parseSchoolOfflineSnapshot", () => {
  it("parses a valid snapshot", () => {
    const parsed = parseSchoolOfflineSnapshot({
      schedule,
      accountPlans: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          place: "Osiedle",
          days: { "1": { start: "08:00", end: "13:00" } },
        },
      ],
      mzkAvailable: true,
      cachedAt: "2026-10-28T09:00:00.000Z",
    });
    expect(parsed?.schedule.title).toBe("Test");
    expect(parsed?.accountPlans).toHaveLength(1);
    expect(parsed?.mzkAvailable).toBe(true);
  });

  it("rejects missing schedule", () => {
    expect(
      parseSchoolOfflineSnapshot({
        accountPlans: [],
        cachedAt: "2026-10-28T09:00:00.000Z",
      }),
    ).toBeNull();
  });

  it("parses optional schedule correction for changes page", () => {
    const original = { ...schedule, title: "Original" };
    const modified = { ...schedule, title: "Modified" };
    const parsed = parseSchoolOfflineSnapshot({
      schedule: modified,
      accountPlans: [],
      mzkAvailable: false,
      cachedAt: "2026-10-28T09:00:00.000Z",
      correction: {
        original,
        modified,
        activeUntil: "2026-10-31",
      },
    });
    expect(parsed?.correction?.original.title).toBe("Original");
    expect(parsed?.correction?.modified?.title).toBe("Modified");
    expect(parsed?.correction?.activeUntil).toBe("2026-10-31");
  });

  it("allows correction with null modified (no active override)", () => {
    const parsed = parseSchoolOfflineSnapshot({
      schedule,
      accountPlans: [],
      mzkAvailable: false,
      cachedAt: "2026-10-28T09:00:00.000Z",
      correction: {
        original: schedule,
        modified: null,
      },
    });
    expect(parsed?.correction?.modified).toBeNull();
  });
});
