import { describe, expect, it, vi } from "vitest";
import type { DowozyOverride, Schedule } from "./types";
import { resolveScheduleSnapshot } from "./resolve-schedule";
import { schoolScheduleFingerprint } from "@/lib/push/schedule-fingerprint";

const base: Schedule = {
  sourceUrl: "https://example.test/dowozy/",
  fetchedAt: "2026-09-22T10:00:00.000Z",
  title: "Baza",
  periodLabel: "wrzesień 2026",
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [{ time: "7:10", places: ["Zatonie"] }],
        },
      ],
    },
  ],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

const overrideSchedule: Schedule = {
  ...base,
  fetchedAt: "2026-09-27T12:00:00.000Z",
  title: "Korekta",
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [{ time: "7:25", places: ["Zatonie"] }],
        },
      ],
    },
  ],
};

function activeOverride(
  schedule: Schedule | null,
  extras: Partial<DowozyOverride> = {},
): DowozyOverride {
  return {
    active: true,
    reason: "Aktualizacja przekazana rodzicom — strona jeszcze nieaktualna",
    createdAt: "2026-09-27T14:30:00+02:00",
    expiresAt: "2026-09-29T22:00:00+02:00",
    schedule,
    ...extras,
  };
}

describe("resolveScheduleSnapshot", () => {
  it("uses base when override is absent", () => {
    const result = resolveScheduleSnapshot({ base, override: null });
    expect(result.schedule).toBe(base);
    expect(result.source).toBe("scrape");
    expect(result.overrideStatus).toBe("none");
  });

  it("uses base when override is inactive", () => {
    const result = resolveScheduleSnapshot({
      base,
      override: {
        active: false,
        reason: "",
        createdAt: "",
        expiresAt: "",
        schedule: overrideSchedule,
      },
    });
    expect(result.schedule).toBe(base);
    expect(result.source).toBe("scrape");
    expect(result.overrideStatus).toBe("none");
  });

  it("uses override schedule when active and valid", () => {
    const result = resolveScheduleSnapshot({
      base,
      override: activeOverride(overrideSchedule),
      now: new Date("2026-09-28T10:00:00+02:00"),
    });
    expect(result.schedule).toBe(overrideSchedule);
    expect(result.source).toBe("override");
    expect(result.overrideStatus).toBe("override_active_conflict");
    expect(result.overrideReason).toContain("rodzicom");
  });

  it("falls back to base when override is expired (ISO offset)", () => {
    const result = resolveScheduleSnapshot({
      base,
      override: activeOverride(overrideSchedule, {
        expiresAt: "2026-09-27T22:00:00+02:00",
      }),
      now: new Date("2026-09-28T10:00:00+02:00"),
    });
    expect(result.schedule).toBe(base);
    expect(result.source).toBe("scrape");
    expect(result.overrideStatus).toBe("override_expired");
  });

  it("marks conflict when fingerprints differ", () => {
    const result = resolveScheduleSnapshot({
      base,
      override: activeOverride(overrideSchedule),
      now: new Date("2026-09-28T10:00:00+02:00"),
    });
    expect(schoolScheduleFingerprint(base)).not.toBe(
      schoolScheduleFingerprint(overrideSchedule),
    );
    expect(result.overrideStatus).toBe("override_active_conflict");
  });

  it("marks matches_source when fingerprints are equal", () => {
    const matching: Schedule = {
      ...overrideSchedule,
      // Same timetable hours as base — only metadata differs
      pickups: base.pickups,
      dropoffsByDate: base.dropoffsByDate,
      dropoffsWeekday: base.dropoffsWeekday,
      periodLabel: base.periodLabel,
      title: "Inny tytuł",
      fetchedAt: "2026-09-28T08:00:00.000Z",
    };
    const result = resolveScheduleSnapshot({
      base,
      override: activeOverride(matching),
      now: new Date("2026-09-28T10:00:00+02:00"),
    });
    expect(result.source).toBe("override");
    expect(result.overrideStatus).toBe("override_matches_source");
  });

  it("falls back to base when override is flagged invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = resolveScheduleSnapshot({
      base,
      override: null,
      overrideInvalid: true,
    });
    expect(result.schedule).toBe(base);
    expect(result.source).toBe("scrape");
    expect(result.overrideStatus).toBe("none");
    warn.mockRestore();
  });

  it("falls back to base when active override has null schedule", () => {
    const result = resolveScheduleSnapshot({
      base,
      override: activeOverride(null),
      now: new Date("2026-09-28T10:00:00+02:00"),
    });
    expect(result.schedule).toBe(base);
    expect(result.source).toBe("scrape");
    expect(result.overrideStatus).toBe("none");
  });

  it("exposes effective timetable content for fingerprint consumers", () => {
    const result = resolveScheduleSnapshot({
      base,
      override: activeOverride(overrideSchedule),
      now: new Date("2026-09-28T10:00:00+02:00"),
    });
    expect(schoolScheduleFingerprint(result.schedule)).toBe(
      schoolScheduleFingerprint(overrideSchedule),
    );
    expect(schoolScheduleFingerprint(result.schedule)).not.toBe(
      schoolScheduleFingerprint(base),
    );
  });
});
