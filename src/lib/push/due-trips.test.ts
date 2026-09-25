import { describe, expect, it } from "vitest";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import type { Schedule } from "@/lib/dowozy/types";
import { dueTripsForPlan } from "./due-trips";

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
            { time: "7:10", places: ["Zatonie", "Marzęcin"] },
            { time: "7:30", places: ["Ługowo"] },
          ],
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
  dropoffsWeekday: [
    {
      title: "Od poniedziałku do piątku",
      driver: "Kierowca A",
      runs: [{ time: "14:00", places: ["Zatonie"] }],
    },
  ],
};

const plan: ChildLessonPlan = {
  place: "Zatonie",
  days: {
    1: { start: "08:00", end: "13:30" },
  },
};

describe("dueTripsForPlan", () => {
  it("returns this person's pickup inside the 20 minute window", () => {
    const trips = dueTripsForPlan(
      schedule,
      plan,
      new Date("2026-09-07T06:56:00+02:00"),
    );

    expect(trips).toEqual([
      expect.objectContaining({
        kind: "pickup",
        time: "07:10",
        place: "Zatonie",
        title: "Odjazd do szkoły za 14 min",
        body: "Zatonie · 07:10",
        id: "2026-09-07|pickup|07:10|Zatonie",
      }),
    ]);
  });

  it("includes a pickup exactly 20 minutes away", () => {
    const trips = dueTripsForPlan(
      schedule,
      plan,
      new Date("2026-09-07T06:50:00+02:00"),
    );

    expect(trips).toEqual([
      expect.objectContaining({
        kind: "pickup",
        title: "Odjazd do szkoły za 20 min",
      }),
    ]);
  });

  it("skips a pickup that is still more than 20 minutes away", () => {
    const trips = dueTripsForPlan(
      schedule,
      plan,
      new Date("2026-09-07T06:49:00+02:00"),
    );
    expect(trips).toEqual([]);
  });

  it("skips a pickup that is still more than 20 minutes away by a wide margin", () => {
    const trips = dueTripsForPlan(
      schedule,
      plan,
      new Date("2026-09-07T06:00:00+02:00"),
    );
    expect(trips).toEqual([]);
  });

  it("returns one dropoff and ignores a duplicate weekday run", () => {
    const trips = dueTripsForPlan(
      schedule,
      plan,
      new Date("2026-09-07T13:50:00+02:00"),
    );

    expect(trips).toHaveLength(1);
    expect(trips[0]).toEqual(
      expect.objectContaining({
        kind: "dropoff",
        time: "14:00",
        place: "Zatonie",
        title: "Autobus powrotny za 10 min",
        body: "Zatonie · 14:00",
      }),
    );
  });

  it("does not notify about dropoffs when the plan has no end time", () => {
    const trips = dueTripsForPlan(
      schedule,
      {
        place: "Zatonie",
        days: { 1: { start: "08:00" } },
      },
      new Date("2026-09-07T13:50:00+02:00"),
    );
    expect(trips).toEqual([]);
  });

  it("skips another place and days without hours", () => {
    expect(
      dueTripsForPlan(
        schedule,
        { place: "Ługowo", days: { 1: { start: "08:00", end: "13:30" } } },
        new Date("2026-09-07T06:56:00+02:00"),
      ),
    ).toEqual([]);

    expect(
      dueTripsForPlan(schedule, plan, new Date("2026-09-11T06:56:00+02:00")),
    ).toEqual([]);
  });

  it("skips the weekend", () => {
    expect(
      dueTripsForPlan(schedule, plan, new Date("2026-09-06T06:56:00+02:00")),
    ).toEqual([]);
  });
});
