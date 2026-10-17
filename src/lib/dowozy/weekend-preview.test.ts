import { describe, expect, it } from "vitest";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import type { Schedule } from "./types";
import {
  buildNextMondayPreview,
  buildNextMondayPreviewForPlans,
  listNextMondayPreviews,
} from "./weekend-preview";

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

describe("listNextMondayPreviews", () => {
  const saturday = new Date("2026-09-26T12:00:00+02:00");

  it("returns every plan that has Monday + matching bus", () => {
    const tuesdayOnly: ChildLessonPlan = {
      place: "Zatonie",
      days: { 2: { start: "08:00", end: "13:00" } },
    };
    const zatonie: ChildLessonPlan = {
      place: "Zatonie",
      days: { 1: { start: "08:00", end: "13:30" } },
    };
    const lugowo: ChildLessonPlan = {
      place: "Ługowo",
      days: { 1: { start: "08:30", end: "14:00" } },
    };

    const previews = listNextMondayPreviews(
      schedule,
      [
        { plan: tuesdayOnly, label: "Ania", index: 0 },
        { plan: zatonie, label: "Celina", index: 1 },
        { plan: lugowo, label: "Bartek", index: 2 },
      ],
      { windowMin: 90, now: saturday },
    );

    expect(previews).toEqual([
      {
        ymd: "2026-09-28",
        weekdayName: "Poniedziałek",
        dayLabel: "Poniedziałek (28.09)",
        lessonStart: "08:00",
        busTime: "07:12",
        planIndex: 1,
        planLabel: "Celina",
      },
      {
        ymd: "2026-09-28",
        weekdayName: "Poniedziałek",
        dayLabel: "Poniedziałek (28.09)",
        lessonStart: "08:30",
        busTime: "07:30",
        planIndex: 2,
        planLabel: "Bartek",
      },
    ]);
  });

  it("returns empty when no plan has Monday with a matching bus", () => {
    expect(
      listNextMondayPreviews(
        schedule,
        [
          {
            plan: { place: "Zatonie", days: { 2: { start: "08:00" } } },
          },
          {
            plan: { place: "Ługowo", days: { 3: { start: "08:00" } } },
          },
        ],
        { windowMin: 90, now: saturday },
      ),
    ).toEqual([]);
  });

  it("buildNextMondayPreviewForPlans still returns the first match", () => {
    expect(
      buildNextMondayPreviewForPlans(
        schedule,
        [
          {
            plan: { place: "Zatonie", days: { 2: { start: "08:00" } } },
            label: "Ania",
          },
          {
            plan: { place: "Ługowo", days: { 1: { start: "08:30" } } },
            label: "Bartek",
          },
        ],
        { windowMin: 90, now: saturday },
      ),
    ).toMatchObject({
      lessonStart: "08:30",
      busTime: "07:30",
      planLabel: "Bartek",
    });
  });
});
