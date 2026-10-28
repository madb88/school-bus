import { afterEach, describe, expect, it, vi } from "vitest";

const fetchDowozyScheduleFromApi = vi.fn();
const getDowozyApiBaseUrl = vi.fn();

vi.mock("./api-client", () => ({
  fetchDowozyScheduleFromApi: (...args: unknown[]) =>
    fetchDowozyScheduleFromApi(...args),
  getDowozyApiBaseUrl: (...args: unknown[]) => getDowozyApiBaseUrl(...args),
}));

import {
  loadScheduleCorrectionOnce,
  loadScheduleSnapshotOnce,
} from "./load-schedule";
import type { Schedule } from "./types";

const baseSchedule: Schedule = {
  sourceUrl: "https://example.test/dowozy/",
  fetchedAt: "2026-10-05T07:33:40.131Z",
  title: "Z API",
  periodLabel: "",
  pickups: [
    {
      name: "API kierowca",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [{ time: "7:00", places: ["Sucha"] }],
        },
      ],
    },
  ],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadScheduleSnapshotOnce", () => {
  it("returns null when API base URL is unset", async () => {
    getDowozyApiBaseUrl.mockReturnValue(null);

    const result = await loadScheduleSnapshotOnce();
    expect(result).toBeNull();
    expect(fetchDowozyScheduleFromApi).not.toHaveBeenCalled();
  });

  it("uses API payload when health+schedule succeed", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: true,
      data: {
        original: baseSchedule,
        modified: { active: false },
      },
    });

    const result = await loadScheduleSnapshotOnce();
    expect(fetchDowozyScheduleFromApi).toHaveBeenCalledWith(
      "http://localhost:8000",
    );
    expect(result?.schedule.title).toBe("Z API");
    expect(result?.source).toBe("scrape");
  });

  it("returns null when API is configured but unavailable", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: false,
      reason: "unhealthy",
    });

    const result = await loadScheduleSnapshotOnce();
    expect(result).toBeNull();
  });
});

describe("loadScheduleCorrectionOnce", () => {
  it("returns original with null modified when correction inactive", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: true,
      data: {
        original: baseSchedule,
        modified: { active: false },
      },
    });

    const result = await loadScheduleCorrectionOnce();
    expect(result?.original.title).toBe("Z API");
    expect(result?.modified).toBeNull();
    expect(result?.activeUntil).toBeUndefined();
    expect(result?.resolved.source).toBe("scrape");
  });

  it("exposes modified + activeUntil while override is in effect", async () => {
    const corrected: Schedule = {
      ...baseSchedule,
      title: "Korekta",
      pickups: [
        {
          name: "API kierowca",
          kind: "driver",
          courses: [
            {
              label: "I kurs",
              stops: [{ time: "7:15", places: ["Sucha"] }],
            },
          ],
        },
      ],
    };

    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: true,
      data: {
        original: baseSchedule,
        modified: {
          active: true,
          activeUntil: "2099-12-31",
          schedule: corrected,
        },
      },
    });

    const result = await loadScheduleCorrectionOnce();
    expect(result?.modified?.title).toBe("Korekta");
    expect(result?.activeUntil).toBe("2099-12-31");
    expect(result?.resolved.source).toBe("override");
    expect(result?.resolved.overrideStatus).toBe("override_active_conflict");
  });
});
