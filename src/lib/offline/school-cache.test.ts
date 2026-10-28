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
});
