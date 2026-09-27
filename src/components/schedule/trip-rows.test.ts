import { describe, expect, it } from "vitest";
import { findLessonsEndedAfterIndex } from "./trip-rows";

describe("findLessonsEndedAfterIndex", () => {
  it("returns null without lesson end or later runs", () => {
    expect(findLessonsEndedAfterIndex(["14:00", "14:20"], null)).toBeNull();
    expect(findLessonsEndedAfterIndex(["14:00"], "13:30")).toBeNull();
    expect(findLessonsEndedAfterIndex(["12:00", "12:30"], "13:30")).toBeNull();
  });

  it("returns index of first run at/after lesson end when a later run exists", () => {
    expect(
      findLessonsEndedAfterIndex(["13:00", "14:00", "14:30"], "13:30"),
    ).toBe(1);
    expect(
      findLessonsEndedAfterIndex(["13:30", "14:00"], "13:30"),
    ).toBe(0);
  });
});
