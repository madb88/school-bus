import { describe, expect, it } from "vitest";
import {
  buildSettingsTransferPayload,
  parseSettingsTransferPayload,
  summarizeTransferPayload,
} from "./payload";
import {
  formatTransferCode,
  generateTransferToken,
  isValidTransferToken,
  normalizeTransferToken,
} from "./token";

describe("settings-transfer token", () => {
  it("normalizes and formats codes", () => {
    expect(normalizeTransferToken("ab7k-9m2q")).toBe("AB7K9M2Q");
    expect(formatTransferCode("AB7K9M2Q")).toBe("AB7K-9M2Q");
    expect(isValidTransferToken("AB7K-9M2Q")).toBe(true);
    expect(isValidTransferToken("ab")).toBe(false);
  });

  it("generates 8-char tokens from the alphabet", () => {
    const token = generateTransferToken(8);
    expect(token).toHaveLength(8);
    expect(isValidTransferToken(token)).toBe(true);
  });
});

describe("settings-transfer payload", () => {
  it("rejects empty plans", () => {
    const built = buildSettingsTransferPayload({
      lessonPlan: { place: null, days: {} },
      mzkRoute: { boardStopId: null, alightStopId: null, route: null },
    });
    expect(built).toEqual({
      error: "Najpierw zapisz plan lekcji albo trasę MZK.",
    });
  });

  it("builds and re-parses a lesson plan payload", () => {
    const built = buildSettingsTransferPayload({
      lessonPlan: {
        place: "Zatonie",
        days: { 1: { start: "08:00", end: "14:00" } },
      },
      mzkRoute: {
        boardStopId: "stop-a",
        alightStopId: "stop-b",
        route: "12",
      },
      matchWindowMin: 60,
    });
    expect("error" in built).toBe(false);
    if ("error" in built) return;

    const parsed = parseSettingsTransferPayload(built);
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;

    expect(parsed.lessonPlan.place).toBe("Zatonie");
    expect(parsed.mzkRoute.route).toBe("12");
    expect(parsed.matchWindowMin).toBe(60);

    const summary = summarizeTransferPayload(parsed);
    expect(summary.lessonDays).toBe(1);
    expect(summary.hasMzkRoute).toBe(true);
    expect(summary.place).toBe("Zatonie");
  });

  it("rejects unknown schema versions", () => {
    const parsed = parseSettingsTransferPayload({
      v: 99,
      lessonPlan: { place: "X", days: { 1: { start: "08:00" } } },
      mzkRoute: { boardStopId: null, alightStopId: null, route: null },
    });
    expect(parsed).toEqual({
      error: "Nieobsługiwana wersja pakietu ustawień.",
    });
  });
});
