import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchMzkMetaFromApi,
  fetchMzkScheduleFromApi,
  getMzkApiBaseUrl,
} from "./api-client";
import type { MzkSchedule, MzkScheduleMetaFile } from "./types";

const schedule: MzkSchedule = {
  sourceUrl: "https://example.test/mzk",
  attribution: "MZK Zielona Góra",
  fetchedAt: "2026-10-05T07:33:40.131Z",
  feedStartDate: "20260326",
  feedEndDate: "20261231",
  stops: [{ id: "1", name: "Test" }],
  trips: [],
  serviceDates: {},
};

const meta: MzkScheduleMetaFile = {
  sourceUrl: schedule.sourceUrl,
  attribution: schedule.attribution,
  fetchedAt: schedule.fetchedAt,
  feedStartDate: schedule.feedStartDate,
  feedEndDate: schedule.feedEndDate,
  stopCount: 1,
  tripCount: 0,
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getMzkApiBaseUrl", () => {
  it("returns null when unset or blank", () => {
    vi.stubEnv("DOWOZY_API_BASE_URL", "");
    expect(getMzkApiBaseUrl()).toBeNull();
  });

  it("strips trailing slashes", () => {
    vi.stubEnv("DOWOZY_API_BASE_URL", "http://localhost:8000/");
    expect(getMzkApiBaseUrl()).toBe("http://localhost:8000");
  });
});

describe("fetchMzkScheduleFromApi", () => {
  it("returns unhealthy when /health is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMzkScheduleFromApi("http://localhost:8000");
    expect(result).toEqual({ ok: false, reason: "unhealthy" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "http://localhost:8000/health",
    );
  });

  it("returns schedule when health and schedule succeed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => schedule,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMzkScheduleFromApi("http://localhost:8000");
    expect(result).toEqual({ ok: true, data: schedule });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "http://localhost:8000/api/v1/mzk/schedule",
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

    const result = await fetchMzkScheduleFromApi("http://localhost:8000");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("fetchMzkMetaFromApi", () => {
  it("returns meta when health and meta succeed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => meta,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMzkMetaFromApi("http://localhost:8000");
    expect(result).toEqual({ ok: true, data: meta });
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "http://localhost:8000/api/v1/mzk/meta",
    );
  });

  it("returns invalid when meta JSON shape is wrong", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ fetchedAt: "x" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMzkMetaFromApi("http://localhost:8000");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});
