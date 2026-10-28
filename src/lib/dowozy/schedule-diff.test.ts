import { describe, expect, it } from "vitest";
import { diffSchedules } from "./schedule-diff";
import type { Schedule } from "./types";

const original: Schedule = {
  sourceUrl: "https://example.test/dowozy/",
  fetchedAt: "2026-10-05T07:33:40.131Z",
  title: "Baza",
  periodLabel: "październik 2026",
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [
            { time: "7:10", places: ["Zatonie"] },
            { time: "7:20", places: ["Sucha"] },
          ],
        },
      ],
    },
  ],
  dropoffsByDate: [
    {
      dateLabel: "6.10",
      driver: "Kierowca A",
      runs: [{ time: "14:00", places: ["Zatonie"] }],
    },
  ],
  dropoffsWeekday: [
    {
      title: "Poniedziałek",
      driver: "Kierowca A",
      runs: [{ time: "15:00", places: ["Sucha"] }],
    },
  ],
};

describe("diffSchedules", () => {
  it("returns empty when schedules are identical (ignoring title/fetchedAt)", () => {
    const modified: Schedule = {
      ...original,
      title: "Korekta",
      fetchedAt: "2026-10-06T00:00:00.000Z",
    };
    expect(diffSchedules(original, modified)).toEqual([]);
  });

  it("reports time change on pickup stop", () => {
    const modified: Schedule = {
      ...original,
      pickups: [
        {
          name: "Kierowca A",
          kind: "driver",
          courses: [
            {
              label: "I kurs",
              stops: [
                { time: "7:25", places: ["Zatonie"] },
                { time: "7:20", places: ["Sucha"] },
              ],
            },
          ],
        },
      ],
    };

    expect(diffSchedules(original, modified)).toEqual([
      {
        section: "pickup",
        change: "time_changed",
        context: "I kurs · Kierowca A",
        places: ["Zatonie"],
        fromTime: "7:10",
        toTime: "7:25",
      },
    ]);
  });

  it("reports added and removed pickup stops", () => {
    const modified: Schedule = {
      ...original,
      pickups: [
        {
          name: "Kierowca A",
          kind: "driver",
          courses: [
            {
              label: "I kurs",
              stops: [
                { time: "7:10", places: ["Zatonie"] },
                { time: "7:30", places: ["Ługowo"] },
              ],
            },
          ],
        },
      ],
    };

    const items = diffSchedules(original, modified);
    expect(items).toContainEqual({
      section: "pickup",
      change: "added",
      context: "I kurs · Kierowca A",
      places: ["Ługowo"],
      toTime: "7:30",
    });
    expect(items).toContainEqual({
      section: "pickup",
      change: "removed",
      context: "I kurs · Kierowca A",
      places: ["Sucha"],
      fromTime: "7:20",
    });
  });

  it("reports dropoff date and weekday time changes", () => {
    const modified: Schedule = {
      ...original,
      dropoffsByDate: [
        {
          dateLabel: "6.10",
          driver: "Kierowca A",
          runs: [{ time: "14:15", places: ["Zatonie"] }],
        },
      ],
      dropoffsWeekday: [
        {
          title: "Poniedziałek",
          driver: "Kierowca A",
          runs: [{ time: "15:10", places: ["Sucha"] }],
        },
      ],
    };

    expect(diffSchedules(original, modified)).toEqual([
      {
        section: "dropoffDate",
        change: "time_changed",
        context: "6.10 · Kierowca A",
        places: ["Zatonie"],
        fromTime: "14:00",
        toTime: "14:15",
      },
      {
        section: "dropoffWeekday",
        change: "time_changed",
        context: "Poniedziałek · Kierowca A",
        places: ["Sucha"],
        fromTime: "15:00",
        toTime: "15:10",
      },
    ]);
  });

  it("reports periodLabel change under meta", () => {
    const modified: Schedule = {
      ...original,
      periodLabel: "listopad 2026",
    };

    expect(diffSchedules(original, modified)).toEqual([
      {
        section: "meta",
        change: "time_changed",
        context: "Okres rozkładu",
        places: [],
        fromTime: "październik 2026",
        toTime: "listopad 2026",
      },
    ]);
  });
});
