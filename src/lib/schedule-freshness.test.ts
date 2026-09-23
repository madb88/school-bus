import { describe, expect, it } from "vitest";
import {
  mzkScheduleFreshness,
  schoolScheduleFreshness,
} from "./schedule-freshness";

describe("schoolScheduleFreshness", () => {
  it("is ok when fetched recently", () => {
    const now = new Date("2026-09-23T12:00:00.000Z");
    expect(
      schoolScheduleFreshness("2026-09-22T10:00:00.000Z", now).level,
    ).toBe("ok");
  });

  it("is stale after three days", () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    expect(
      schoolScheduleFreshness("2026-09-22T10:00:00.000Z", now).level,
    ).toBe("stale");
  });
});

describe("mzkScheduleFreshness", () => {
  it("marks expired feeds", () => {
    const now = new Date("2027-01-02T12:00:00.000Z");
    expect(
      mzkScheduleFreshness(
        "2026-12-30T10:00:00.000Z",
        "20261231",
        now,
      ).level,
    ).toBe("expired");
  });

  it("warns near feed end", () => {
    const now = new Date("2026-12-25T12:00:00.000Z");
    expect(
      mzkScheduleFreshness(
        "2026-12-24T10:00:00.000Z",
        "20261231",
        now,
      ).level,
    ).toBe("stale");
  });
});
