import { describe, expect, it } from "vitest";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import type { MzkOdDeparture, MzkSchedule } from "@/lib/mzk/types";
import type { Schedule } from "./types";
import {
  buildWeeklyLessonPrint,
  nearestAfternoonMzk,
  nearestMorningMzk,
} from "./weekly-print";

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
          stops: [{ time: "6:40", places: ["Zatonie"] }],
        },
        {
          label: "II kurs",
          stops: [
            { time: "7:05", places: ["Zatonie"] },
            { time: "7:05", places: ["Zatonie"] },
          ],
        },
        {
          label: "IV kurs",
          note: "od poniedziałku do czwartku",
          stops: [{ time: "7:20", places: ["Zatonie"] }],
        },
      ],
    },
  ],
  dropoffsByDate: [
    {
      dateLabel: "Poniedziałek, 7 września",
      driver: "Kierowca A",
      runs: [
        { time: "14:45", places: ["Zatonie"] },
        { time: "15:30", places: ["Zatonie"] },
        { time: "14:45", places: ["Zatonie"] },
      ],
    },
    {
      dateLabel: "Piątek, 11 września",
      driver: "Kierowca A",
      runs: [{ time: "13:40", places: ["Zatonie"] }],
    },
  ],
  dropoffsWeekday: [
    {
      title: "Odwozy – poniedziałek–piątek",
      driver: "Kierowca B",
      runs: [{ time: "16:20", places: ["Zatonie"] }],
    },
  ],
};

const plan: ChildLessonPlan = {
  place: "Zatonie",
  days: {
    1: { start: "08:00", end: "14:00" },
    2: { start: "8:00" },
    5: { start: "08:00", end: "13:30" },
  },
};

const mzkPickups: MzkOdDeparture[] = [
  {
    departTime: "06:50",
    arriveTime: "07:20",
    route: "12",
    headsign: "Centrum",
    boardStopName: "Zatonie",
    alightStopName: "Szkoła",
  },
  {
    departTime: "07:25",
    arriveTime: "07:50",
    route: "30",
    headsign: "Centrum",
    boardStopName: "Zatonie",
    alightStopName: "Szkoła",
  },
  {
    departTime: "08:05",
    arriveTime: "08:25",
    route: "12",
    headsign: "Centrum",
    boardStopName: "Zatonie",
    alightStopName: "Szkoła",
  },
];

const mzkDropoffs: MzkOdDeparture[] = [
  {
    departTime: "13:50",
    arriveTime: "14:20",
    route: "30",
    headsign: "Zatonie",
    boardStopName: "Szkoła",
    alightStopName: "Zatonie",
  },
  {
    departTime: "14:10",
    arriveTime: "14:40",
    route: "12",
    headsign: "Zatonie",
    boardStopName: "Szkoła",
    alightStopName: "Zatonie",
  },
  {
    departTime: "18:30",
    arriveTime: "19:00",
    route: "12",
    headsign: "Zatonie",
    boardStopName: "Szkoła",
    alightStopName: "Zatonie",
  },
];

describe("buildWeeklyLessonPrint", () => {
  const days = buildWeeklyLessonPrint(schedule, plan, 150);
  const byWeekday = Object.fromEntries(days.map((day) => [day.weekday, day]));

  it("lists every matching departure and return, deduped and sorted", () => {
    expect(byWeekday[1]).toMatchObject({
      label: "Pon",
      lessonStart: "08:00",
      lessonEnd: "14:00",
      departures: ["06:40", "07:05", "07:20"],
      returns: ["14:45", "15:30", "16:20"],
      mzkDeparture: null,
      mzkReturn: null,
    });
  });

  it("drops a Monday–Thursday course on Friday", () => {
    expect(byWeekday[5]?.departures).toEqual(["06:40", "07:05"]);
    expect(byWeekday[5]?.returns).toEqual(["13:40"]);
  });

  it("leaves a day without lessons empty", () => {
    expect(byWeekday[3]).toMatchObject({
      lessonStart: null,
      lessonEnd: null,
      departures: [],
      returns: [],
    });
  });

  it("shows departures without a return when the lesson has no end", () => {
    expect(byWeekday[2]).toMatchObject({
      lessonStart: "08:00",
      lessonEnd: null,
      departures: ["06:40", "07:05", "07:20"],
      returns: [],
    });
  });
});

describe("nearest MZK helpers", () => {
  it("picks the latest morning arrival still before lessons", () => {
    expect(nearestMorningMzk(mzkPickups, "08:00", 150)).toEqual({
      time: "07:25",
      route: "30",
    });
  });

  it("picks the earliest afternoon departure after lessons, ignoring after 18:00", () => {
    expect(nearestAfternoonMzk(mzkDropoffs, "14:00", 150)).toEqual({
      time: "14:10",
      route: "12",
    });
  });
});

describe("buildWeeklyLessonPrint with MZK", () => {
  const mzkSchedule: MzkSchedule = {
    sourceUrl: "https://example.test/mzk",
    attribution: "MZK",
    fetchedAt: "2026-09-22T10:00:00.000Z",
    feedStartDate: "20260901",
    feedEndDate: "20260930",
    stops: [
      { id: "board", name: "Zatonie MZK" },
      { id: "school", name: "Szkoła" },
    ],
    trips: [
      {
        route: "30",
        headsign: "Szkoła",
        serviceId: "school",
        stops: [
          { stopId: "board", time: "07:25", sequence: 1 },
          { stopId: "school", time: "07:50", sequence: 2 },
        ],
      },
      {
        route: "12",
        headsign: "Zatonie",
        serviceId: "school",
        stops: [
          { stopId: "school", time: "14:10", sequence: 1 },
          { stopId: "board", time: "14:40", sequence: 2 },
        ],
      },
    ],
    serviceDates: {
      school: [
        "20260907",
        "20260908",
        "20260909",
        "20260910",
        "20260911",
      ],
    },
  };

  it("attaches only the nearest MZK trips per day", () => {
    const days = buildWeeklyLessonPrint(schedule, plan, 150, {
      mzkSchedule,
      mzkRoute: {
        boardStopId: "board",
        alightStopId: "school",
        route: null,
      },
    });
    const monday = days.find((day) => day.weekday === 1);
    expect(monday?.mzkDeparture).toEqual({ time: "07:25", route: "30" });
    expect(monday?.mzkReturn).toEqual({ time: "14:10", route: "12" });
    expect(days.find((day) => day.weekday === 2)?.mzkReturn).toBeNull();
  });
});
