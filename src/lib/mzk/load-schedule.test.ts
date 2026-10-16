import { afterEach, describe, expect, it, vi } from "vitest";

const fetchMzkScheduleFromApi = vi.fn();
const fetchMzkMetaFromApi = vi.fn();
const getMzkApiBaseUrl = vi.fn();

vi.mock("./api-client", () => ({
  fetchMzkScheduleFromApi: (...args: unknown[]) =>
    fetchMzkScheduleFromApi(...args),
  fetchMzkMetaFromApi: (...args: unknown[]) => fetchMzkMetaFromApi(...args),
  getMzkApiBaseUrl: (...args: unknown[]) => getMzkApiBaseUrl(...args),
}));

import {
  loadMzkScheduleMetaOnce,
  loadMzkScheduleSnapshotOnce,
} from "./load-schedule";

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadMzkScheduleSnapshotOnce", () => {
  it("returns null when API base URL is unset", async () => {
    getMzkApiBaseUrl.mockReturnValue(null);

    const result = await loadMzkScheduleSnapshotOnce();
    expect(result).toBeNull();
    expect(fetchMzkScheduleFromApi).not.toHaveBeenCalled();
  });

  it("uses API payload when health+schedule succeed", async () => {
    getMzkApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchMzkScheduleFromApi.mockResolvedValue({
      ok: true,
      data: {
        sourceUrl: "https://example.test/mzk",
        attribution: "MZK",
        fetchedAt: "2026-10-05T07:33:40.131Z",
        feedStartDate: "20260326",
        feedEndDate: "20261231",
        stops: [{ id: "99", name: "Z API" }],
        trips: [],
        serviceDates: {},
      },
    });

    const result = await loadMzkScheduleSnapshotOnce();
    expect(fetchMzkScheduleFromApi).toHaveBeenCalledWith(
      "http://localhost:8000",
    );
    expect(result?.stops[0]?.name).toBe("Z API");
  });

  it("returns null when API is configured but unavailable", async () => {
    getMzkApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchMzkScheduleFromApi.mockResolvedValue({
      ok: false,
      reason: "unhealthy",
    });

    const result = await loadMzkScheduleSnapshotOnce();
    expect(result).toBeNull();
  });
});

describe("loadMzkScheduleMetaOnce", () => {
  it("returns null when API base URL is unset", async () => {
    getMzkApiBaseUrl.mockReturnValue(null);

    const result = await loadMzkScheduleMetaOnce();
    expect(result).toBeNull();
    expect(fetchMzkMetaFromApi).not.toHaveBeenCalled();
  });

  it("uses meta API when configured", async () => {
    getMzkApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchMzkMetaFromApi.mockResolvedValue({
      ok: true,
      data: {
        sourceUrl: "https://example.test/mzk",
        attribution: "MZK",
        fetchedAt: "2026-10-05T07:33:40.131Z",
        feedStartDate: "20260326",
        feedEndDate: "20261231",
        stopCount: 42,
        tripCount: 7,
      },
    });

    const result = await loadMzkScheduleMetaOnce();
    expect(fetchMzkMetaFromApi).toHaveBeenCalledWith("http://localhost:8000");
    expect(result?.stopCount).toBe(42);
    expect(fetchMzkScheduleFromApi).not.toHaveBeenCalled();
  });

  it("returns null when meta API is configured but unavailable", async () => {
    getMzkApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchMzkMetaFromApi.mockResolvedValue({
      ok: false,
      reason: "http",
    });

    const result = await loadMzkScheduleMetaOnce();
    expect(result).toBeNull();
  });
});
