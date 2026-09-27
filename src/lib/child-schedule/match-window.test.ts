import { describe, expect, it } from "vitest";
import {
  clampLessonMatchWindow,
  DEFAULT_LESSON_MATCH_WINDOW_MIN,
  MAX_LESSON_MATCH_WINDOW_MIN,
  MIN_LESSON_MATCH_WINDOW_MIN,
} from "./match-window";

describe("clampLessonMatchWindow", () => {
  it("returns default for non-finite values", () => {
    expect(clampLessonMatchWindow(Number.NaN)).toBe(
      DEFAULT_LESSON_MATCH_WINDOW_MIN,
    );
    expect(clampLessonMatchWindow(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_LESSON_MATCH_WINDOW_MIN,
    );
  });

  it("clamps to min and max", () => {
    expect(clampLessonMatchWindow(1)).toBe(MIN_LESSON_MATCH_WINDOW_MIN);
    expect(clampLessonMatchWindow(999)).toBe(MAX_LESSON_MATCH_WINDOW_MIN);
  });

  it("rounds to nearest minute", () => {
    expect(clampLessonMatchWindow(45.4)).toBe(45);
    expect(clampLessonMatchWindow(45.6)).toBe(46);
  });

  it("keeps values already in range", () => {
    expect(clampLessonMatchWindow(150)).toBe(150);
  });
});
