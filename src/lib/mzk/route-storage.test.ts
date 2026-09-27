import { describe, expect, it } from "vitest";
import {
  hasConfiguredMzkRoute,
  parseMzkRoutePreference,
} from "./route-storage";
import { EMPTY_MZK_ROUTE } from "./route-preference";

describe("parseMzkRoutePreference", () => {
  it("returns empty preference for invalid input", () => {
    expect(parseMzkRoutePreference(null)).toEqual({ ...EMPTY_MZK_ROUTE });
    expect(parseMzkRoutePreference("x")).toEqual({ ...EMPTY_MZK_ROUTE });
  });

  it("parses stop ids and optional route", () => {
    expect(
      parseMzkRoutePreference({
        boardStopId: " 123 ",
        alightStopId: "456",
        route: " 30 ",
      }),
    ).toEqual({
      boardStopId: "123",
      alightStopId: "456",
      route: "30",
    });
  });

  it("drops blank stop ids", () => {
    expect(
      parseMzkRoutePreference({
        boardStopId: "   ",
        alightStopId: "456",
        route: "",
      }),
    ).toEqual({
      boardStopId: null,
      alightStopId: "456",
      route: null,
    });
  });
});

describe("hasConfiguredMzkRoute", () => {
  it("requires both stops", () => {
    expect(hasConfiguredMzkRoute(EMPTY_MZK_ROUTE)).toBe(false);
    expect(
      hasConfiguredMzkRoute({
        boardStopId: "1",
        alightStopId: null,
        route: null,
      }),
    ).toBe(false);
    expect(
      hasConfiguredMzkRoute({
        boardStopId: "1",
        alightStopId: "2",
        route: "30",
      }),
    ).toBe(true);
  });
});
