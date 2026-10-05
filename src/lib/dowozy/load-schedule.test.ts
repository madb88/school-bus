import { afterEach, describe, expect, it, vi } from "vitest";

const fetchDowozyScheduleFromApi = vi.fn();
const getDowozyApiBaseUrl = vi.fn();

vi.mock("./api-client", () => ({
  fetchDowozyScheduleFromApi: (...args: unknown[]) =>
    fetchDowozyScheduleFromApi(...args),
  getDowozyApiBaseUrl: (...args: unknown[]) => getDowozyApiBaseUrl(...args),
}));

import { loadScheduleSnapshotOnce } from "./load-schedule";

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadScheduleSnapshotOnce", () => {
  it("loads from local JSON when API base URL is unset", async () => {
    getDowozyApiBaseUrl.mockReturnValue(null);

    const result = await loadScheduleSnapshotOnce(process.cwd());
    expect(result).not.toBeNull();
    expect(result?.schedule.pickups.length).toBeGreaterThan(0);
    expect(fetchDowozyScheduleFromApi).not.toHaveBeenCalled();
  });

  it("uses API payload when health+schedule succeed", async () => {
    getDowozyApiBaseUrl.mockReturnValue("http://localhost:8000");
    fetchDowozyScheduleFromApi.mockResolvedValue({
      ok: true,
      data: {
        original: {
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
        },
        modified: { active: false },
      },
    });

    const result = await loadScheduleSnapshotOnce(process.cwd());
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

    const result = await loadScheduleSnapshotOnce(process.cwd());
    expect(result).toBeNull();
  });
});
