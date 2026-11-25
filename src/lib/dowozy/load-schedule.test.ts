import { afterEach, describe, expect, it, vi } from "vitest";

const fetchSchoolScheduleFromApi = vi.fn();
const fetchDowozyScheduleFromApi = vi.fn();
const getDowozyApiBaseUrl = vi.fn();

vi.mock("@/lib/schools/api-client", () => ({
  fetchSchoolScheduleFromApi: (...args: unknown[]) =>
    fetchSchoolScheduleFromApi(...args),
}));

vi.mock("./api-client", () => ({
  getDowozyApiBaseUrl: (...args: unknown[]) => getDowozyApiBaseUrl(...args),
  fetchDowozyScheduleFromApi: (...args: unknown[]) =>
    fetchDowozyScheduleFromApi(...args),
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

const correctedSchedule: Schedule = {
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

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadScheduleSnapshotOnce", () => {
  it("returns null when API base URL is unset", async () => {
    getDowozyApiBaseUrl.mockReturnValue(null);

    const result = await loadScheduleSnapshotOnce(SCHOOL_ID);
    expect(result).toBeNull();
    expect(fetchDowozyScheduleFromApi).not.toHaveBeenCalled();
    expect(fetchSchoolScheduleFromApi).not.toHaveBeenCalled();
  });

  it("uses the dowozy wrapper when available", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: true,
      data: { original: baseSchedule },
    });

    const result = await loadScheduleSnapshotOnce(SCHOOL_ID);
    expect(fetchDowozyScheduleFromApi).toHaveBeenCalledWith(
      "http://localhost:8000",
      SCHOOL_ID,
    );
    expect(fetchSchoolScheduleFromApi).not.toHaveBeenCalled();
    expect(result?.schedule.title).toBe("Z API");
    expect(result?.source).toBe("scrape");
  });

  it("falls back to school schedule when the wrapper is unavailable", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: false,
      reason: "http",
    });
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

  it("returns null when both APIs are unavailable", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: false,
      reason: "http",
    });
    fetchSchoolScheduleFromApi.mockResolvedValue({
      ok: false,
      reason: "unhealthy",
    });

    const result = await loadScheduleSnapshotOnce(SCHOOL_ID);
    expect(result).toBeNull();
  });
});

describe("loadScheduleCorrectionOnce", () => {
  it("exposes active modified schedule for the banner and changes page", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: true,
      data: {
        original: baseSchedule,
        modified: {
          active: true,
          activeUntil: "2099-12-31",
          schedule: correctedSchedule,
        },
      },
    });

    const result = await loadScheduleCorrectionOnce(SCHOOL_ID);
    expect(result?.original.title).toBe("Z API");
    expect(result?.modified?.title).toBe("Korekta");
    expect(result?.activeUntil).toBe("2099-12-31");
    expect(result?.resolved.source).toBe("override");
    expect(result?.resolved.overrideStatus).toBe("override_active_conflict");
    expect(result?.resolved.schedule.title).toBe("Korekta");
  });

  it("returns null modified when the wrapper has no active correction", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: true,
      data: { original: baseSchedule },
    });

    const result = await loadScheduleCorrectionOnce(SCHOOL_ID);
    expect(result?.modified).toBeNull();
    expect(result?.activeUntil).toBeUndefined();
    expect(result?.resolved.source).toBe("scrape");
  });

  it("returns null modified on the school-schedule fallback", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: false,
      reason: "http",
    });
    fetchSchoolScheduleFromApi.mockResolvedValue({
      ok: true,
      data: baseSchedule,
    });

    const result = await loadScheduleCorrectionOnce(SCHOOL_ID);
    expect(result?.original.title).toBe("Z API");
    expect(result?.modified).toBeNull();
    expect(result?.resolved.source).toBe("scrape");
  });
});
