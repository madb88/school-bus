import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Schedule } from "@/lib/dowozy/types";
import { schoolScheduleFingerprint } from "./schedule-fingerprint";

const acquireDispatchLock = vi.fn();
const listPushRecords = vi.fn();
const releaseDispatchLock = vi.fn();
const loadScheduleSnapshot = vi.fn();
const sendPush = vi.fn();
const savePushRecord = vi.fn();

vi.mock("@/lib/dowozy/load-schedule", () => ({
  loadScheduleSnapshot: (...args: unknown[]) => loadScheduleSnapshot(...args),
}));

vi.mock("./store", () => ({
  acquireDispatchLock: (...args: unknown[]) => acquireDispatchLock(...args),
  deletePushRecord: vi.fn(),
  listPushRecords: (...args: unknown[]) => listPushRecords(...args),
  releaseDispatchLock: (...args: unknown[]) => releaseDispatchLock(...args),
  savePushRecord: (...args: unknown[]) => savePushRecord(...args),
  subscriptionId: vi.fn(() => "sub-1"),
}));

vi.mock("./send", () => ({
  sendPush: (...args: unknown[]) => sendPush(...args),
}));

const baseSchedule: Schedule = {
  sourceUrl: "https://example.test",
  fetchedAt: "2026-09-22T10:00:00.000Z",
  title: "Baza",
  periodLabel: "wrzesień 2026",
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [{ time: "7:10", places: ["Zatonie"] }],
        },
      ],
    },
  ],
  dropoffsByDate: [],
  dropoffsWeekday: [],
};

const overrideSchedule: Schedule = {
  ...baseSchedule,
  pickups: [
    {
      name: "Kierowca A",
      kind: "driver",
      courses: [
        {
          label: "I kurs",
          stops: [{ time: "7:25", places: ["Zatonie"] }],
        },
      ],
    },
  ],
};

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

  it("fingerprints the effective override schedule, not the scrape base", async () => {
    acquireDispatchLock.mockResolvedValue(true);
    loadScheduleSnapshot.mockResolvedValue({
      schedule: overrideSchedule,
      source: "override",
      overrideStatus: "override_active_conflict",
    });
    listPushRecords.mockResolvedValue([
      {
        subscription: {
          endpoint: "https://push.example/1",
          keys: { p256dh: "x", auth: "y" },
        },
        plan: {
          place: "Zatonie",
          days: {
            mon: { start: "08:00", end: "14:00" },
            tue: null,
            wed: null,
            thu: null,
            fri: null,
          },
        },
        sentOn: "",
        sent: [],
        scheduleFingerprint: schoolScheduleFingerprint(baseSchedule),
        kinds: { pickup: false, dropoff: false, schedule: true },
      },
    ]);
    sendPush.mockResolvedValue("ok");
    savePushRecord.mockResolvedValue(undefined);

    const { dispatchReminders } = await import("./dispatch");
    const monday = new Date("2026-09-28T10:00:00+02:00");
    await dispatchReminders(monday);

    expect(sendPush).toHaveBeenCalled();
    expect(savePushRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleFingerprint: schoolScheduleFingerprint(overrideSchedule),
      }),
    );
    expect(schoolScheduleFingerprint(overrideSchedule)).not.toBe(
      schoolScheduleFingerprint(baseSchedule),
    );
  });
});
