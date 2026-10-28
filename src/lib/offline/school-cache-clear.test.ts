import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSchoolOfflineSnapshot } from "./school-cache";

const idbClearStore = vi.hoisted(() => vi.fn());

vi.mock("./idb", () => ({
  idbGet: vi.fn(),
  idbSet: vi.fn(),
  idbClearStore: (...args: unknown[]) => idbClearStore(...args),
}));

describe("clearSchoolOfflineSnapshot", () => {
  afterEach(() => {
    idbClearStore.mockReset();
  });

  it("retries once when the first clear fails", async () => {
    idbClearStore
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue(undefined);

    await expect(clearSchoolOfflineSnapshot()).resolves.toBeUndefined();
    // First school clear fails; retry clears school + mzkOd.
    expect(idbClearStore).toHaveBeenCalledTimes(3);
  });
});
