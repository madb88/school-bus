import { describe, expect, it } from "vitest";
import {
  nearestPlaceNote,
  placeStopsMapFromEntries,
  suggestMzkRoutes,
} from "./route-suggestions";
import type { MzkSchedule } from "./types";

function scheduleFixture(): MzkSchedule {
  return {
    sourceUrl: "test",
    attribution: "test",
    fetchedAt: "2026-01-01T00:00:00.000Z",
    feedStartDate: "20260101",
    feedEndDate: "20261231",
    stops: [
      { id: "350", name: "Zatonie" },
      { id: "356", name: "Zatonie Parkowa" },
      { id: "307", name: "Drzonków - WOSiR" },
      { id: "299", name: "Drzonków Olimpijska" },
    ],
    trips: [
      {
        route: "30",
        headsign: "Drzonków",
        serviceId: "wd",
        stops: [
          { stopId: "350", time: "07:00", sequence: 1 },
          { stopId: "307", time: "07:20", sequence: 2 },
        ],
      },
      {
        route: "30",
        headsign: "Drzonków",
        serviceId: "wd",
        stops: [
          { stopId: "350", time: "08:00", sequence: 1 },
          { stopId: "299", time: "08:20", sequence: 2 },
        ],
      },
    ],
    serviceDates: {
      // Enough weekdays around "today" for resolveSchoolServiceIds("all").
      wd: [
        "20261123",
        "20261124",
        "20261125",
        "20261126",
        "20261127",
        "20261130",
        "20261201",
        "20261202",
        "20261203",
        "20261204",
      ],
    },
  };
}

describe("suggestMzkRoutes", () => {
  it("uses placeStops and schoolStopIds order", () => {
    const suggestions = suggestMzkRoutes(scheduleFixture(), "Marzęcin", {
      schoolStopIds: ["307", "299"],
      placeStops: {
        Marzęcin: { stopIds: ["350", "356"], note: "z Zatonia" },
      },
    });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]?.boardName).toMatch(/Zatonie/i);
    expect(suggestions[0]?.alightStopId).toBe("307");
  });

  it("falls back to name match when place has no mapped stops", () => {
    const suggestions = suggestMzkRoutes(scheduleFixture(), "Zatonie", {
      schoolStopIds: ["307"],
      placeStops: {},
    });
    expect(suggestions.some((s) => s.boardName.includes("Zatonie"))).toBe(true);
  });

  it("returns empty when schoolStopIds are missing from the schedule", () => {
    expect(
      suggestMzkRoutes(scheduleFixture(), "Marzęcin", {
        schoolStopIds: ["999"],
        placeStops: { Marzęcin: { stopIds: ["350"] } },
      }),
    ).toEqual([]);
  });
});

describe("placeStops helpers", () => {
  it("builds a map and reads the nearest-stop note", () => {
    const map = placeStopsMapFromEntries([
      {
        place: "Marzęcin",
        stopIds: ["350"],
        note: "Brak przystanku MZK w Marzęcinie — propozycje z Zatonia.",
      },
    ]);
    expect(nearestPlaceNote("Marzęcin", map)).toContain("Zatonia");
    expect(nearestPlaceNote("Książ", map)).toBeNull();
  });
});
