import { describe, expect, it } from "vitest";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import type { MzkOdDeparture } from "@/lib/mzk/types";
import {
  buildBestTodayRecommendation,
  detectBestTodayWindowGaps,
} from "./best-today";
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
          stops: [
            { time: "06:40", places: ["Zatonie"] },
            { time: "07:20", places: ["Zatonie"] },
            { time: "07:50", places: ["Ługowo"] },
          ],
        },
      ],
    },
  ],
  dropoffsByDate: [],
  dropoffsWeekday: [
    {
      title: "Odwozy",
      driver: "Kierowca A",
      runs: [
        { time: "14:10", places: ["Zatonie"] },
        { time: "15:00", places: ["Zatonie"] },
      ],
    },
  ],
};

const plan: ChildLessonPlan = {
  place: "Zatonie",
  days: {
    1: { start: "08:00", end: "13:30" },
  },
};

const mondayNoon = new Date("2026-09-07T12:00:00+02:00");

const mzkPickups: MzkOdDeparture[] = [
  {
    departTime: "07:05",
    arriveTime: "07:35",
    route: "12",
    headsign: "Szkoła",
    boardStopName: "Zatonie MZK",
    alightStopName: "Szkoła",
  },
  {
    departTime: "07:25",
    arriveTime: "07:55",
    route: "12",
    headsign: "Szkoła",
    boardStopName: "Zatonie MZK",
    alightStopName: "Szkoła",
  },
];

const mzkDropoffs: MzkOdDeparture[] = [
  {
    departTime: "13:40",
    arriveTime: "14:05",
    route: "12",
    headsign: "Zatonie",
    boardStopName: "Szkoła",
    alightStopName: "Zatonie MZK",
  },
  {
    departTime: "14:30",
    arriveTime: "14:55",
    route: "12",
    headsign: "Zatonie",
    boardStopName: "Szkoła",
    alightStopName: "Zatonie MZK",
  },
];

describe("buildBestTodayRecommendation", () => {
  it("picks latest school pickup and earliest school dropoff for the plan", () => {
    const result = buildBestTodayRecommendation({
      schedule,
      place: "Zatonie",
      dateFilter: "today",
      now: mondayNoon,
      lessonPlan: plan,
      windowMin: 150,
      sourceMode: "school",
      lessonStart: "08:00",
      lessonEnd: "13:30",
    });

    expect(result).toMatchObject({
      lessonStart: "08:00",
      lessonEnd: "13:30",
      pickup: {
        time: "07:20",
        source: "school",
        direction: "pickup",
        label: "Zatonie",
      },
      dropoff: {
        time: "14:10",
        source: "school",
        direction: "dropoff",
        label: "Zatonie",
      },
    });
  });

  it("prefers closer MZK trips when school+mzk mode is on", () => {
    const result = buildBestTodayRecommendation({
      schedule,
      place: "Zatonie",
      dateFilter: "today",
      now: mondayNoon,
      lessonPlan: plan,
      windowMin: 150,
      sourceMode: "school-mzk",
      lessonStart: "08:00",
      lessonEnd: "13:30",
      mzkPickups,
      mzkDropoffs,
    });

    expect(result?.pickup).toMatchObject({
      time: "07:25",
      source: "mzk",
      direction: "pickup",
      route: "12",
      label: "Zatonie MZK → Szkoła",
    });
    expect(result?.dropoff).toMatchObject({
      time: "13:40",
      source: "mzk",
      direction: "dropoff",
      route: "12",
      label: "Szkoła → Zatonie MZK",
    });
  });

  it("returns null without a lesson plan", () => {
    expect(
      buildBestTodayRecommendation({
        schedule,
        place: "Zatonie",
        dateFilter: "today",
        now: mondayNoon,
        lessonPlan: null,
        windowMin: 150,
        sourceMode: "school",
        lessonStart: "08:00",
        lessonEnd: "13:30",
      }),
    ).toBeNull();
  });

  it("returns null when nothing fits the match window", () => {
    expect(
      buildBestTodayRecommendation({
        schedule,
        place: "Zatonie",
        dateFilter: "today",
        now: mondayNoon,
        lessonPlan: plan,
        windowMin: 20,
        sourceMode: "school",
        lessonStart: "08:00",
        lessonEnd: "13:30",
      }),
    ).toBeNull();
  });

  it("detects dropoff hidden by a tight match window while pickup still fits", () => {
    const earlyEndPlan: ChildLessonPlan = {
      place: "Zatonie",
      days: {
        1: { start: "08:00", end: "12:00" },
      },
    };
    const options = {
      schedule,
      place: "Zatonie",
      dateFilter: "today" as const,
      now: mondayNoon,
      lessonPlan: earlyEndPlan,
      sourceMode: "school" as const,
      lessonStart: "08:00",
      lessonEnd: "12:00",
    };

    const withWindow = buildBestTodayRecommendation({
      ...options,
      windowMin: 50,
    });
    const withoutWindow = buildBestTodayRecommendation({
      ...options,
      windowMin: Number.POSITIVE_INFINITY,
    });

    expect(withWindow?.pickup?.time).toBe("07:20");
    expect(withWindow?.dropoff).toBeNull();
    expect(withoutWindow?.dropoff?.time).toBe("14:10");
    expect(detectBestTodayWindowGaps(withWindow, withoutWindow)).toEqual({
      pickup: false,
      dropoff: true,
    });
  });
});
