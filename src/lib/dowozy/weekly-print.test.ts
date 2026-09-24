import { describe, expect, it } from "vitest";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import type { Schedule } from "./types";
import { buildWeeklyLessonPrint } from "./weekly-print";

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
