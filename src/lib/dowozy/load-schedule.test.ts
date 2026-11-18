import { afterEach, describe, expect, it, vi } from "vitest";

const fetchSchoolScheduleFromApi = vi.fn();
const getDowozyApiBaseUrl = vi.fn();

vi.mock("@/lib/schools/api-client", () => ({
  fetchSchoolScheduleFromApi: (...args: unknown[]) =>
    fetchSchoolScheduleFromApi(...args),
}));

vi.mock("./api-client", () => ({
  getDowozyApiBaseUrl: (...args: unknown[]) => getDowozyApiBaseUrl(...args),
}));

import {
  loadScheduleCorrectionOnce,
  loadScheduleSnapshotOnce,
} from "./load-schedule";
import type { Schedule } from "./types";

const SCHOOL_ID = "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680";

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

    const result = await loadScheduleSnapshotOnce(SCHOOL_ID);
    expect(result).toBeNull();
    expect(fetchSchoolScheduleFromApi).not.toHaveBeenCalled();
  });

  it("uses school schedule when health+schedule succeed", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchSchoolScheduleFromApi.mockResolvedValue({
      ok: true,
      data: baseSchedule,
    });

    const result = await loadScheduleSnapshotOnce(SCHOOL_ID);
    expect(fetchSchoolScheduleFromApi).toHaveBeenCalledWith(
      "http://localhost:8000",
      SCHOOL_ID,
    );
    expect(result?.schedule.title).toBe("Z API");
    expect(result?.source).toBe("scrape");
  });

  it("returns null when API is configured but unavailable", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchSchoolScheduleFromApi.mockResolvedValue({
      ok: false,
      reason: "unhealthy",
    });

    const result = await loadScheduleSnapshotOnce(SCHOOL_ID);
    expect(result).toBeNull();
  });
});

describe("loadScheduleCorrectionOnce", () => {
  it("returns shown schedule with null modified", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchSchoolScheduleFromApi.mockResolvedValue({
      ok: true,
      data: baseSchedule,
    });

    const result = await loadScheduleCorrectionOnce(SCHOOL_ID);
    expect(result?.original.title).toBe("Z API");
    expect(result?.modified).toBeNull();
    expect(result?.activeUntil).toBeUndefined();
    expect(result?.resolved.source).toBe("scrape");
  });
});
