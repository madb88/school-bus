import { describe, expect, it } from "vitest";
import { parsePushKinds } from "./kinds";

describe("parsePushKinds", () => {
  it("keeps every kind on when nothing was stored", () => {
    expect(parsePushKinds(undefined)).toEqual({
      departure: true,
      return: true,
      schedule: true,
    });
  });

  it("turns off only the kind that was unchecked", () => {
    expect(parsePushKinds({ return: false })).toEqual({
      departure: true,
      return: false,
      schedule: true,
    });
  });
});
