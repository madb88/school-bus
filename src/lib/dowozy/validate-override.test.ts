import { describe, expect, it } from "vitest";
import { isDowozyOverride, isValidIsoTimestamp } from "./validate-override";

const validSchedule = {
  sourceUrl: "https://example.test",
  fetchedAt: "2026-09-22T10:00:00.000Z",
  title: "Test",
  periodLabel: "wrzesień 2026",
  pickups: [],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

describe("isValidIsoTimestamp", () => {
  it("accepts ISO with offset", () => {
    expect(isValidIsoTimestamp("2026-09-29T22:00:00+02:00")).toBe(true);
  });

  it("rejects empty and garbage", () => {
    expect(isValidIsoTimestamp("")).toBe(false);
    expect(isValidIsoTimestamp("not-a-date")).toBe(false);
  });
});

describe("isDowozyOverride", () => {
  it("accepts inactive placeholder", () => {
    expect(
      isDowozyOverride({
        active: false,
        reason: "",
        createdAt: "",
        expiresAt: "",
        schedule: null,
      }),
    ).toBe(true);
  });

  it("accepts active override with full schedule", () => {
    expect(
      isDowozyOverride({
        active: true,
        reason: "test",
        createdAt: "2026-09-27T14:30:00+02:00",
        expiresAt: "2026-09-29T22:00:00+02:00",
        schedule: validSchedule,
      }),
    ).toBe(true);
  });

  it("rejects missing active or schedule key", () => {
    expect(
      isDowozyOverride({
        reason: "",
        createdAt: "",
        schedule: null,
      }),
    ).toBe(false);
    expect(
      isDowozyOverride({
        active: false,
        reason: "",
        createdAt: "",
      }),
    ).toBe(false);
  });

  it("rejects invalid expiresAt when non-empty", () => {
    expect(
      isDowozyOverride({
        active: false,
        reason: "",
        createdAt: "",
        expiresAt: "jutro",
        schedule: null,
      }),
    ).toBe(false);
  });

  it("rejects corrupt schedule object", () => {
    expect(
      isDowozyOverride({
        active: true,
        reason: "x",
        createdAt: "2026-09-27T14:30:00+02:00",
        schedule: { fetchedAt: "x" },
      }),
    ).toBe(false);
  });
});
