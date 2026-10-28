import { describe, expect, it } from "vitest";
import { offlineConnectivityFreshness } from "./freshness";

describe("offlineConnectivityFreshness", () => {
  it("includes cachedAt when provided", () => {
    const info = offlineConnectivityFreshness("2026-10-28T08:15:00.000Z");
    expect(info.level).toBe("stale");
    expect(info.message).toContain("Brak połączenia z internetem");
    expect(info.message).toContain("dane z");
  });

  it("works without cachedAt", () => {
    const info = offlineConnectivityFreshness(null);
    expect(info.level).toBe("stale");
    expect(info.message).toContain("nieaktualny");
  });
});
