import { describe, expect, it, vi } from "vitest";
import { loadPlusPanel, plusPanelFromStatus } from "./status";

const TOKEN = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
const NOW = new Date("2026-09-30T10:00:00.000Z");

const fetchPlus = vi.fn();

vi.mock("@/lib/auth/backend", () => ({
  fetchPlus: (...args: unknown[]) => fetchPlus(...args),
}));

describe("plus panel from backend status", () => {
  it("maps active with Polish labels", () => {
    expect(
      plusPanelFromStatus({ state: "active", validUntil: "2027-08-31" }, NOW),
    ).toEqual({
      state: "active",
      validUntil: "2027-08-31",
      validUntilLabel: "31 sierpnia 2027",
      remainingLabel: "11 miesięcy",
    });
  });

  it("maps pending and inactive straight across", () => {
    expect(plusPanelFromStatus({ state: "pending" }, NOW)).toEqual({ state: "pending" });
    expect(plusPanelFromStatus({ state: "inactive" }, NOW)).toEqual({ state: "inactive" });
  });

  it("maps unavailable to unknown", () => {
    expect(plusPanelFromStatus("unavailable", NOW)).toEqual({ state: "unknown" });
  });

  it("loadPlusPanel forwards the session token to fetchPlus", async () => {
    fetchPlus.mockResolvedValue({ state: "pending" });
    expect(await loadPlusPanel(TOKEN, NOW)).toEqual({ state: "pending" });
    expect(fetchPlus).toHaveBeenCalledWith(TOKEN);
  });
});
