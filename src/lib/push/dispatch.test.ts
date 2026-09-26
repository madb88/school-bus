import { beforeEach, describe, expect, it, vi } from "vitest";

const acquireDispatchLock = vi.fn();
const listPushRecords = vi.fn();
const releaseDispatchLock = vi.fn();
const loadScheduleSnapshot = vi.fn();

vi.mock("@/lib/dowozy/load-schedule", () => ({
  loadScheduleSnapshot: (...args: unknown[]) => loadScheduleSnapshot(...args),
}));

vi.mock("./store", () => ({
  acquireDispatchLock: (...args: unknown[]) => acquireDispatchLock(...args),
  deletePushRecord: vi.fn(),
  listPushRecords: (...args: unknown[]) => listPushRecords(...args),
  releaseDispatchLock: (...args: unknown[]) => releaseDispatchLock(...args),
  savePushRecord: vi.fn(),
  subscriptionId: vi.fn(),
}));

vi.mock("./send", () => ({
  sendPush: vi.fn(),
}));

describe("dispatchReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips Redis work on Saturday (Warsaw)", async () => {
    const { dispatchReminders } = await import("./dispatch");
    const saturday = new Date("2026-09-05T10:00:00+02:00");

    const summary = await dispatchReminders(saturday);

    expect(summary).toEqual({
      checked: 0,
      sent: 0,
      removed: 0,
      skipped: "weekend",
    });
    expect(acquireDispatchLock).not.toHaveBeenCalled();
    expect(listPushRecords).not.toHaveBeenCalled();
    expect(loadScheduleSnapshot).not.toHaveBeenCalled();
    expect(releaseDispatchLock).not.toHaveBeenCalled();
  });

  it("skips Redis work on Sunday (Warsaw)", async () => {
    const { dispatchReminders } = await import("./dispatch");
    const sunday = new Date("2026-09-06T10:00:00+02:00");

    const summary = await dispatchReminders(sunday);

    expect(summary).toEqual({
      checked: 0,
      sent: 0,
      removed: 0,
      skipped: "weekend",
    });
    expect(acquireDispatchLock).not.toHaveBeenCalled();
    expect(listPushRecords).not.toHaveBeenCalled();
  });
});
