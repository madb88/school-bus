import { describe, expect, it } from "vitest";
import {
  formatTransferCode,
  generateTransferToken,
  isValidTransferToken,
  normalizeTransferToken,
} from "./token";

describe("normalizeTransferToken", () => {
  it("strips separators and uppercases", () => {
    expect(normalizeTransferToken("ab7k-9m2q")).toBe("AB7K9M2Q");
    expect(normalizeTransferToken(" ab 7k ")).toBe("AB7K");
  });
});

describe("formatTransferCode", () => {
  it("formats 8-char tokens with a dash", () => {
    expect(formatTransferCode("AB7K9M2Q")).toBe("AB7K-9M2Q");
  });

  it("leaves other lengths ungrouped", () => {
    expect(formatTransferCode("ABC")).toBe("ABC");
  });
});

describe("isValidTransferToken", () => {
  it("accepts length 6–16 alphanumeric", () => {
    expect(isValidTransferToken("ABCDEF")).toBe(true);
    expect(isValidTransferToken("AB7K-9M2Q")).toBe(true);
  });

  it("rejects too short or empty", () => {
    expect(isValidTransferToken("ABCDE")).toBe(false);
    expect(isValidTransferToken("")).toBe(false);
  });
});

describe("generateTransferToken", () => {
  it("returns requested length from allowed alphabet", () => {
    const token = generateTransferToken(8);
    expect(token).toHaveLength(8);
    expect(token).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
  });
});
