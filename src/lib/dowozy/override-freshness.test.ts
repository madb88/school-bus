import { describe, expect, it } from "vitest";
import { overrideFreshnessInfo } from "./override-freshness";

describe("overrideFreshnessInfo", () => {
  it("returns null when scrape is the source", () => {
    expect(
      overrideFreshnessInfo({
        source: "scrape",
        overrideStatus: "none",
      }),
    ).toBeNull();
    expect(
      overrideFreshnessInfo({
        source: "scrape",
        overrideStatus: "override_expired",
      }),
    ).toBeNull();
  });

  it("describes an active conflict in plain language", () => {
    const info = overrideFreshnessInfo({
      source: "override",
      overrideStatus: "override_active_conflict",
    });
    expect(info?.message).toMatch(/tymczasową korektę/i);
    expect(info?.detail).toMatch(/rodzicom/i);
    expect(info?.level).toBe("stale");
  });

  it("describes a match with the official schedule", () => {
    const info = overrideFreshnessInfo({
      source: "override",
      overrideStatus: "override_matches_source",
    });
    expect(info?.message).toMatch(/zgodna z oficjalnym/i);
  });
});
