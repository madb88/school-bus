import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNoticesFromApi } from "./api-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchNoticesFromApi", () => {
  it("returns unhealthy when /health is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoticesFromApi("http://localhost:8000", ["sp1"]);
    expect(result).toEqual({ ok: false, reason: "unhealthy" });
  });

  it("returns notices when health and notices succeed", async () => {
    const payload = [
      {
        id: "schedule_notice_1",
        schoolId: "sp1",
        dateFrom: "2026-11-16",
        dateTo: "2026-11-20",
        kind: "urgent",
        title: "W tym tygodniu",
        message: "Treść",
        blocksSchedule: true,
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => payload,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoticesFromApi("http://localhost:8000", [
      "sp1",
      "sp1",
    ]);
    expect(result).toEqual({ ok: true, data: payload });
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "http://localhost:8000/api/v1/notices?schoolId=sp1",
    );
  });

  it("returns invalid when schoolIds are empty", async () => {
    const result = await fetchNoticesFromApi("http://localhost:8000", ["  "]);
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("returns http when notices endpoint fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchNoticesFromApi("http://localhost:8000", ["sp1"]);
    expect(result).toEqual({ ok: false, reason: "http" });
  });
});
