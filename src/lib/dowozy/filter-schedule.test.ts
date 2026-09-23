import { describe, expect, it } from "vitest";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import { collectPlaces, countVisibleTrips, filterSchedule } from "./filter-schedule";
import type { Schedule } from "./types";

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
          note: "od poniedziałku do czwartku",
          stops: [
            { time: "7:10", places: ["Zatonie", "Marzęcin"] },
            { time: "7:30", places: ["Ługowo"] },
          ],
        },
        {
          label: "II kurs",
          stops: [{ time: "7:45", places: ["Sucha"] }],
        },
      ],
    },
  ],
  dropoffsByDate: [
    {
      dateLabel: "Poniedziałek, 7 września",
      driver: "Kierowca A",
      runs: [
        { time: "14:00", places: ["Zatonie", "Marzęcin"] },
        { time: "14:20", places: ["Ługowo"] },
      ],
    },
  ],
  dropoffsWeekday: [],
};

const lessonPlan: ChildLessonPlan = {
  place: "Zatonie",
  days: {
    1: { start: "08:00", end: "13:30" },
  },
};

describe("collectPlaces", () => {
  it("returns unique sorted places", () => {
    expect(collectPlaces(schedule)).toEqual([
      "Ługowo",
      "Marzęcin",
      "Sucha",
      "Zatonie",
    ]);
  });
});

describe("filterSchedule", () => {
  it("filters pickups by place", () => {
    const filtered = filterSchedule(schedule, {
      place: "Zatonie",
      direction: "pickups",
      dateFilter: "all",
      lessonPlan,
      matchLessonPlan: false,
      now: new Date("2026-09-07T06:00:00+02:00"),
    });

    expect(filtered.pickups).toHaveLength(1);
    expect(filtered.pickups[0].courses).toHaveLength(1);
    expect(filtered.pickups[0].courses[0].stops[0].places).toEqual(["Zatonie"]);
    expect(filtered.dropoffsByDate).toHaveLength(0);
  });

  it("matches lesson windows for pickups and dropoffs", () => {
    const filtered = filterSchedule(schedule, {
      place: "Zatonie",
      direction: "all",
      dateFilter: "today",
      lessonPlan,
      matchLessonPlan: true,
      lessonMatchWindowMin: 90,
      now: new Date("2026-09-07T06:00:00+02:00"),
    });

    expect(countVisibleTrips(filtered)).toBeGreaterThan(0);
    expect(filtered.pickups[0]?.courses[0]?.stops[0]?.time).toBe("7:10");
    expect(filtered.dropoffsByDate[0]?.runs[0]?.time).toBe("14:00");
  });

  it("hides Friday-only-violating mon–thu courses on Friday", () => {
    const filtered = filterSchedule(schedule, {
      place: null,
      direction: "pickups",
      dateFilter: "today",
      lessonPlan: { place: null, days: {} },
      matchLessonPlan: false,
      now: new Date("2026-09-11T06:00:00+02:00"), // Friday
    });

    const labels = filtered.pickups.flatMap((block) =>
      block.courses.map((course) => course.label),
    );
    expect(labels).toEqual(["II kurs"]);
  });
});
