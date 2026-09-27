import { describe, expect, it } from "vitest";
import type { Schedule } from "@/lib/dowozy/types";
import type { MzkOdDeparture } from "./types";
import { buildMergedTimeline, findNextMergedEntry } from "./merge-timeline";

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
          stops: [{ time: "07:30", places: ["Zatonie"] }],
        },
      ],
    },
  ],
  dropoffsByDate: [
    {
      dateLabel: "Poniedziałek, 7 września",
      driver: "Kierowca A",
      runs: [{ time: "14:10", places: ["Zatonie"] }],
    },
  ],
  dropoffsWeekday: [],
};

const mzkPickup: MzkOdDeparture = {
  departTime: "07:15",
  arriveTime: "07:45",
  route: "30",
  headsign: "Centrum",
  boardStopName: "Zatonie",
  alightStopName: "Szkoła",
};

const mzkDropoff: MzkOdDeparture = {
  departTime: "14:00",
  arriveTime: "14:25",
  route: "30",
  headsign: "Zatonie",
  boardStopName: "Szkoła",
  alightStopName: "Zatonie",
};

describe("buildMergedTimeline", () => {
  it("merges and sorts school + MZK pickups", () => {
    const { pickups, dropoffs } = buildMergedTimeline({
      schedule,
      mzkPickups: [mzkPickup],
      mzkDropoffs: [mzkDropoff],
      direction: "all",
    });

    expect(pickups.map((e) => e.time)).toEqual(["07:15", "07:30"]);
    expect(pickups[0]?.kind).toBe("mzk");
    expect(pickups[1]?.kind).toBe("school");
    expect(dropoffs.map((e) => e.time)).toEqual(["14:00", "14:10"]);
  });

  it("respects direction filter", () => {
    const onlyPickups = buildMergedTimeline({
      schedule,
      mzkPickups: [mzkPickup],
      mzkDropoffs: [mzkDropoff],
      direction: "pickups",
    });
    expect(onlyPickups.pickups).toHaveLength(2);
    expect(onlyPickups.dropoffs).toHaveLength(0);
  });
});

describe("findNextMergedEntry", () => {
  const timeline = buildMergedTimeline({
    schedule,
    mzkPickups: [mzkPickup],
    mzkDropoffs: [mzkDropoff],
    direction: "all",
  });

  it("returns null on weekend", () => {
    expect(
      findNextMergedEntry(timeline, new Date("2026-09-12T08:00:00+02:00")),
    ).toBeNull();
  });

  it("picks earliest remaining entry", () => {
    const next = findNextMergedEntry(
      timeline,
      new Date("2026-09-07T07:20:00+02:00"),
    );
    expect(next).toMatchObject({
      time: "07:30",
      kind: "pickup",
    });
    expect(next?.label).toContain("szkolny");
  });
});
