import { describe, expect, it } from "vitest";
import type { Schedule } from "@/lib/dowozy/types";
import { schoolScheduleFingerprint } from "./schedule-fingerprint";

const schedule: Schedule = {
  sourceUrl: "https://example.test",
  fetchedAt: "2026-09-22T10:00:00.000Z",
  title: "Test",
  periodLabel: "wrzesień 2026",
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [{ time: "7:10", places: ["Zatonie"] }],
        },
      ],
    },
  ],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

describe("schoolScheduleFingerprint", () => {
  it("ignores a newer download of the same hours", () => {
    const refreshed: Schedule = {
      ...schedule,
      fetchedAt: "2026-09-23T04:00:00.000Z",
      title: "Inny tytuł strony",
    };

    expect(schoolScheduleFingerprint(refreshed)).toBe(
      schoolScheduleFingerprint(schedule),
    );
  });

  it("changes when a departure time changes", () => {
    const updated: Schedule = {
      ...schedule,
      pickups: [
        {
          ...schedule.pickups[0],
          courses: [
            {
              label: "I kurs",
              stops: [{ time: "7:20", places: ["Zatonie"] }],
            },
          ],
        },
      ],
    };

    expect(schoolScheduleFingerprint(updated)).not.toBe(
      schoolScheduleFingerprint(schedule),
    );
  });
});
