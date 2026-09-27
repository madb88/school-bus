import { describe, expect, it } from "vitest";
import type { Schedule } from "./types";
import { findNextTrip, stopDomId } from "./next-trip";

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
            { time: "07:10", places: ["Zatonie"] },
            { time: "07:40", places: ["Ługowo"] },
          ],
        },
      ],
    },
  ],
  dropoffsByDate: [
    {
      dateLabel: "Poniedziałek, 7 września",
      driver: "Kierowca A",
      runs: [{ time: "14:00", places: ["Zatonie"] }],
    },
  ],
  dropoffsWeekday: [],
};

describe("stopDomId", () => {
  it("slugifies without spaces and keeps a stable prefix", () => {
    expect(stopDomId("pickup", ["Kierowca A", "I kurs", "0", "7:10"])).toBe(
      "stop-pickup-Kierowca-A-I-kurs-0-7:10",
    );
    const withDiacritics = stopDomId("dropoff-date", ["Ługowo", "1", "14:00"]);
    expect(withDiacritics.startsWith("stop-dropoff-date-")).toBe(true);
    expect(withDiacritics).toContain("1-14:00");
    expect(withDiacritics).not.toMatch(/\s/);
  });
});

describe("findNextTrip", () => {
  it("returns null on weekend", () => {
    expect(
      findNextTrip(schedule, new Date("2026-09-12T08:00:00+02:00")),
    ).toBeNull();
  });

  it("picks the soonest stop at or after now", () => {
    const next = findNextTrip(
      schedule,
      new Date("2026-09-07T07:20:00+02:00"),
    );
    expect(next).toMatchObject({
      kind: "pickup",
      time: "07:40",
      places: ["Ługowo"],
    });
  });

  it("falls through to afternoon dropoff when morning is past", () => {
    const next = findNextTrip(
      schedule,
      new Date("2026-09-07T12:00:00+02:00"),
    );
    expect(next).toMatchObject({
      kind: "dropoff",
      time: "14:00",
      places: ["Zatonie"],
    });
  });

  it("returns null when nothing remains today", () => {
    expect(
      findNextTrip(schedule, new Date("2026-09-07T20:00:00+02:00")),
    ).toBeNull();
  });
});
