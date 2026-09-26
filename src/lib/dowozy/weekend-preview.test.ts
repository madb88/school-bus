import { describe, expect, it } from "vitest";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import type { Schedule } from "./types";
import { buildNextMondayPreview } from "./weekend-preview";

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
            { time: "7:12", places: ["Zatonie"] },
            { time: "7:30", places: ["Ługowo"] },
          ],
        },
      ],
    },
  ],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

const plan: ChildLessonPlan = {
  place: "Zatonie",
  days: {
    1: { start: "08:00", end: "13:30" },
  },
};

describe("buildNextMondayPreview", () => {
  it("returns Monday lesson + earliest matching pickup from a weekend", () => {
    const preview = buildNextMondayPreview(schedule, plan, {
      place: "Zatonie",
      windowMin: 90,
      now: new Date("2026-09-26T12:00:00+02:00"), // Saturday
    });

    expect(preview).toEqual({
      ymd: "2026-09-28",
      weekdayName: "Poniedziałek",
      dayLabel: "Poniedziałek (28.09)",
      lessonStart: "08:00",
      busTime: "07:12",
    });
  });

  it("returns null without a Monday lesson plan", () => {
    expect(
      buildNextMondayPreview(
        schedule,
        { place: "Zatonie", days: { 2: { start: "08:00" } } },
        { now: new Date("2026-09-26T12:00:00+02:00") },
      ),
    ).toBeNull();
  });

  it("returns null when no pickup fits the lesson window", () => {
    expect(
      buildNextMondayPreview(schedule, plan, {
        place: "Zatonie",
        windowMin: 30,
        now: new Date("2026-09-26T12:00:00+02:00"),
      }),
    ).toBeNull();
  });
});
