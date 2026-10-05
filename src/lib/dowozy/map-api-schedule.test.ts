import { describe, expect, it } from "vitest";
import {
  expiresAtAfterInclusiveWarsawDay,
  mapApiModifiedToOverride,
  mapApiResponseToResolveInput,
  warsawStartOfDayMs,
} from "./map-api-schedule";
import { resolveScheduleSnapshot } from "./resolve-schedule";
import type { Schedule } from "./types";

const original: Schedule = {
  sourceUrl: "https://example.test/dowozy/",
  fetchedAt: "2026-10-05T07:33:40.131Z",
  title: "Baza",
  periodLabel: "",
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [{ time: "7:10", places: ["Zatonie"] }],
        },
      ],
    },
  ],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

const modifiedSchedule: Schedule = {
  ...original,
  title: "Korekta",
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [{ time: "7:25", places: ["Zatonie"] }],
        },
      ],
    },
  ],
};

describe("warsawStartOfDayMs", () => {
  it("returns midnight Warsaw for a summer date (CEST)", () => {
    const ms = warsawStartOfDayMs("2026-07-01");
    expect(ms).not.toBeNull();
    // 2026-07-01 00:00 CEST = 2026-06-30 22:00 UTC
    expect(new Date(ms!).toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });

  it("returns midnight Warsaw for a winter date (CET)", () => {
    const ms = warsawStartOfDayMs("2026-01-15");
    expect(ms).not.toBeNull();
    // 2026-01-15 00:00 CET = 2026-01-14 23:00 UTC
    expect(new Date(ms!).toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });
});

describe("expiresAtAfterInclusiveWarsawDay", () => {
  it("expires at start of the next Warsaw day", () => {
    // activeUntil 2026-10-06 inclusive → expire 2026-10-07 00:00 Warsaw (CEST)
    expect(expiresAtAfterInclusiveWarsawDay("2026-10-06")).toBe(
      "2026-10-06T22:00:00.000Z",
    );
  });

  it("returns undefined for garbage", () => {
    expect(expiresAtAfterInclusiveWarsawDay("")).toBeUndefined();
    expect(expiresAtAfterInclusiveWarsawDay("not-a-date")).toBeUndefined();
  });
});

describe("mapApiModifiedToOverride", () => {
  it("maps inactive modified to inactive override", () => {
    expect(mapApiModifiedToOverride({ active: false })).toEqual({
      active: false,
      reason: "",
      createdAt: "",
      schedule: null,
    });
  });

  it("maps active modified with activeUntil", () => {
    const override = mapApiModifiedToOverride({
      active: true,
      activeUntil: "2026-10-06",
      schedule: modifiedSchedule,
    });
    expect(override?.active).toBe(true);
    expect(override?.schedule).toEqual(modifiedSchedule);
    expect(override?.expiresAt).toBe("2026-10-06T22:00:00.000Z");
  });
});

describe("mapApiResponseToResolveInput + resolve", () => {
  it("uses original when modified is inactive", () => {
    const input = mapApiResponseToResolveInput({
      original,
      modified: { active: false },
    });
    const result = resolveScheduleSnapshot(input);
    expect(result.source).toBe("scrape");
    expect(result.schedule).toEqual(original);
  });

  it("uses modified schedule while activeUntil day is current", () => {
    const input = mapApiResponseToResolveInput({
      original,
      modified: {
        active: true,
        activeUntil: "2026-10-06",
        schedule: modifiedSchedule,
      },
    });
    const result = resolveScheduleSnapshot({
      ...input,
      now: new Date("2026-10-06T12:00:00+02:00"),
    });
    expect(result.source).toBe("override");
    expect(result.schedule.title).toBe("Korekta");
  });

  it("falls back to original after activeUntil day ends", () => {
    const input = mapApiResponseToResolveInput({
      original,
      modified: {
        active: true,
        activeUntil: "2026-10-06",
        schedule: modifiedSchedule,
      },
    });
    const result = resolveScheduleSnapshot({
      ...input,
      now: new Date("2026-10-07T00:00:00+02:00"),
    });
    expect(result.source).toBe("scrape");
    expect(result.overrideStatus).toBe("override_expired");
  });
});
