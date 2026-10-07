import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchDowozyScheduleFromApi,
  getDowozyApiBaseUrl,
} from "./api-client";
import type { Schedule } from "./types";

const schedule: Schedule = {
  sourceUrl: "https://example.test/dowozy/",
  fetchedAt: "2026-10-05T07:33:40.131Z",
  title: "API",
  periodLabel: "",
  pickups: [],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getDowozyApiBaseUrl", () => {
  it("returns null when unset or blank", () => {
    vi.stubEnv("DOWOZY_API_BASE_URL", "");
    expect(getDowozyApiBaseUrl()).toBeNull();
  });

  it("strips trailing slashes", () => {
    vi.stubEnv("DOWOZY_API_BASE_URL", "http://localhost:8000/");
    expect(getDowozyApiBaseUrl()).toBe("http://localhost:8000");
  });
});

describe("fetchDowozyScheduleFromApi", () => {
  it("returns unhealthy when /health is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDowozyScheduleFromApi("http://localhost:8000");
    expect(result).toEqual({ ok: false, reason: "unhealthy" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://localhost:8000/health",
    );
  });

  it("returns schedule when health and schedule succeed", async () => {
    const payload = {
      original: schedule,
      modified: { active: false },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => payload,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDowozyScheduleFromApi("http://localhost:8000");
    expect(result).toEqual({ ok: true, data: payload });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "http://localhost:8000/api/v1/dowozy/schedule",
    );
  });

  it("returns invalid when schedule JSON shape is wrong", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ not: "a schedule" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDowozyScheduleFromApi("http://localhost:8000");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});
