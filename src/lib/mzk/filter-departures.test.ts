import { describe, expect, it } from "vitest";
import {
  findOdDepartures,
  formatTravelDuration,
  resolveSchoolServiceIds,
  stopIdsWithSameName,
} from "./filter-departures";
import { isSchoolWeekdayService } from "./parse-gtfs";
import type { MzkSchedule } from "./types";

const schedule: MzkSchedule = {
  sourceUrl: "https://example.test",
  attribution: "Test MZK",
  fetchedAt: "2026-09-22T10:00:00.000Z",
  feedStartDate: "20260901",
  feedEndDate: "20261231",
  stops: [
    { id: "1", name: "Zatonie Parkowa" },
    { id: "2", name: "Zatonie Parkowa" },
    { id: "3", name: "Drzonków - WOSiR" },
  ],
  trips: [
    {
      route: "30",
      headsign: "Drzonków",
      serviceId: "30_RO",
      stops: [
        { stopId: "1", time: "7:05", sequence: 1 },
        { stopId: "3", time: "7:25", sequence: 2 },
      ],
    },
    {
      route: "30",
      headsign: "Drzonków",
      serviceId: "30_RO",
      stops: [
        { stopId: "2", time: "7:05", sequence: 1 },
        { stopId: "3", time: "7:25", sequence: 2 },
      ],
    },
    {
      route: "2",
      headsign: "Centrum",
      serviceId: "2_RW",
      stops: [
        { stopId: "3", time: "14:10", sequence: 1 },
        { stopId: "1", time: "14:30", sequence: 2 },
      ],
    },
  ],
  serviceDates: {
    "30_RO": ["20260907", "20260908"],
    "2_RW": ["20260907", "20260908"],
  },
};

describe("isSchoolWeekdayService", () => {
  it("accepts _RO and _RW suffixes", () => {
    expect(isSchoolWeekdayService("12_RO")).toBe(true);
    expect(isSchoolWeekdayService("12_RW")).toBe(true);
    expect(isSchoolWeekdayService("12_SO")).toBe(false);
  });
});

describe("stopIdsWithSameName", () => {
  it("includes both road sides", () => {
    expect(stopIdsWithSameName(schedule, "1").sort()).toEqual(["1", "2"]);
  });
});

describe("findOdDepartures", () => {
  it("returns board→alight trips for a school weekday", () => {
    const results = findOdDepartures(
      schedule,
      "1",
      "3",
      "today",
      new Date("2026-09-07T06:00:00+02:00"),
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      departTime: "7:05",
      arriveTime: "7:25",
      route: "30",
      boardStopName: "Zatonie Parkowa",
      alightStopName: "Drzonków - WOSiR",
    });
  });

  it("returns empty on weekend", () => {
    const results = findOdDepartures(
      schedule,
      "1",
      "3",
      "today",
      new Date("2026-09-05T06:00:00+02:00"), // Saturday
    );
    expect(results).toEqual([]);
  });

  it("filters by route when provided", () => {
    const results = findOdDepartures(
      schedule,
      "3",
      "1",
      "today",
      new Date("2026-09-07T06:00:00+02:00"),
      "2",
    );
    expect(results).toHaveLength(1);
    expect(results[0].route).toBe("2");
  });
});

describe("resolveSchoolServiceIds", () => {
  it("resolves services for today", () => {
    const ids = resolveSchoolServiceIds(
      schedule,
      "today",
      new Date("2026-09-07T06:00:00+02:00"),
    );
    expect([...ids].sort()).toEqual(["2_RW", "30_RO"]);
  });

  it("resolves services for an absolute YYYY-MM-DD", () => {
    const ids = resolveSchoolServiceIds(
      schedule,
      "2026-09-08",
      new Date("2026-09-05T06:00:00+02:00"),
    );
    expect([...ids].sort()).toEqual(["2_RW", "30_RO"]);
  });
});

describe("formatTravelDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatTravelDuration("7:05", "7:25")).toBe("20 min");
    expect(formatTravelDuration("7:00", "8:05")).toBe("1 h 5 min");
  });
});
