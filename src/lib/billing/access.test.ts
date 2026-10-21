import { describe, expect, it } from "vitest";
import {
  hasPlusAccess,
  hasPlusAccessFromPanel,
  hasPushPlusAccess,
  isPastTrialWindow,
} from "./access";

describe("hasPlusAccess", () => {
  it("always grants admin", () => {
    expect(hasPlusAccess("admin", "unavailable")).toBe(true);
    expect(hasPlusAccess("admin", { state: "inactive" })).toBe(true);
    expect(hasPlusAccess("admin", { state: "pending" })).toBe(true);
  });

  it("grants active and trial", () => {
    expect(
      hasPlusAccess("individual", { state: "active", validUntil: "2027-08-31" }),
    ).toBe(true);
    expect(
      hasPlusAccess("individual", { state: "trial", validUntil: "2026-10-30" }),
    ).toBe(true);
    expect(
      hasPlusAccess("school", { state: "trial", validUntil: "2026-10-30" }),
    ).toBe(true);
  });

  it("denies pending, inactive and unavailable", () => {
    expect(hasPlusAccess("individual", { state: "pending" })).toBe(false);
    expect(hasPlusAccess("individual", { state: "inactive" })).toBe(false);
    expect(hasPlusAccess("individual", "unavailable")).toBe(false);
    expect(hasPlusAccess("school", { state: "inactive" })).toBe(false);
  });
});

describe("hasPushPlusAccess", () => {
  it("allows admin, active and trial", () => {
    expect(hasPushPlusAccess("admin", { state: "inactive" })).toBe(true);
    expect(
      hasPushPlusAccess("individual", {
        state: "active",
        validUntil: "2027-08-31",
      }),
    ).toBe(true);
    expect(
      hasPushPlusAccess("individual", {
        state: "trial",
        validUntil: "2026-10-30",
      }),
    ).toBe(true);
    expect(hasPushPlusAccess("individual", { state: "pending" })).toBe(false);
    expect(hasPushPlusAccess("individual", "unavailable")).toBe(false);
  });
});

describe("hasPlusAccessFromPanel", () => {
  it("mirrors hasPlusAccess for panel states", () => {
    expect(hasPlusAccessFromPanel("admin", { state: "inactive" })).toBe(true);
    expect(
      hasPlusAccessFromPanel("individual", {
        state: "trial",
        validUntil: "2026-10-30",
        validUntilLabel: "30 października 2026",
        remainingLabel: "Pozostało 5 dni",
      }),
    ).toBe(true);
    expect(hasPlusAccessFromPanel("individual", { state: "pending" })).toBe(
      false,
    );
  });
});

describe("isPastTrialWindow", () => {
  it("is true when createdAt is older than the trial weeks", () => {
    expect(
      isPastTrialWindow("2026-01-01T00:00:00.000Z", new Date("2026-10-16T12:00:00.000Z")),
    ).toBe(true);
    expect(
      isPastTrialWindow("2026-10-10T00:00:00.000Z", new Date("2026-10-16T12:00:00.000Z")),
    ).toBe(false);
  });
});
