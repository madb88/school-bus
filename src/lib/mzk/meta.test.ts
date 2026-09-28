import { describe, expect, it } from "vitest";
import { mzkMetaFromSchedule } from "./meta";
import type { MzkSchedule } from "./types";
import { isMzkScheduleMeta } from "./validate-schedule";

const sampleSchedule: MzkSchedule = {
  sourceUrl: "https://example.test",
  attribution: "Test MZK",
  fetchedAt: "2026-09-22T12:00:00.000Z",
  feedStartDate: "20260101",
  feedEndDate: "20261231",
  stops: [
    { id: "1", name: "A" },
    { id: "2", name: "B" },
  ],
  trips: [
    {
      route: "1",
      headsign: "X",
      serviceId: "s1",
      stops: [{ stopId: "1", time: "07:00", sequence: 1 }],
    },
  ],
  serviceDates: { s1: ["20260922"] },
};

describe("mzkMetaFromSchedule", () => {
  it("extracts lightweight counts without trips payload", () => {
    const meta = mzkMetaFromSchedule(sampleSchedule);
    expect(meta).toEqual({
      sourceUrl: "https://example.test",
      attribution: "Test MZK",
      fetchedAt: "2026-09-22T12:00:00.000Z",
      feedStartDate: "20260101",
      feedEndDate: "20261231",
      stopCount: 2,
      tripCount: 1,
    });
    expect(isMzkScheduleMeta(meta)).toBe(true);
  });
});

describe("isMzkScheduleMeta", () => {
  it("rejects incomplete sidecar payloads", () => {
    expect(isMzkScheduleMeta({ fetchedAt: "x" })).toBe(false);
    expect(isMzkScheduleMeta(null)).toBe(false);
  });
});
