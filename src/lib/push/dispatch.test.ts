import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
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

const plan: ChildLessonPlan = {
  place: "Zatonie",
  days: {
    1: { start: "08:00", end: "14:00" },
  },
};

const subscription = {
  endpoint: "https://push.example/1",
  keys: { p256dh: "x", auth: "y" },
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
      scheduleSource: null,
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
      scheduleSource: null,
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
        subscription,
        plan,
        sentOn: "",
        sent: [],
        scheduleFingerprint: schoolScheduleFingerprint(baseSchedule),
        kinds: { departure: false, return: false, schedule: true },
      },
    ]);
    sendPush.mockResolvedValue("ok");
    savePushRecord.mockResolvedValue(undefined);

    const { dispatchReminders } = await import("./dispatch");
    const monday = new Date("2026-09-28T10:00:00+02:00");
    const summary = await dispatchReminders(monday);

    expect(summary.scheduleSource).toBe("override");
    expect(sendPush).toHaveBeenCalledWith(
      subscription,
      expect.objectContaining({
        title: "Rozkład jazdy zaktualizowany",
      }),
    );
    expect(savePushRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleFingerprint: schoolScheduleFingerprint(overrideSchedule),
        sentOn: "",
        sent: [],
      }),
    );
    expect(schoolScheduleFingerprint(overrideSchedule)).not.toBe(
      schoolScheduleFingerprint(baseSchedule),
    );
  });

  it("notifies the override trip time after a schedule change clears sent", async () => {
    acquireDispatchLock.mockResolvedValue(true);
    loadScheduleSnapshot.mockResolvedValue({
      schedule: overrideSchedule,
      source: "override",
      overrideStatus: "override_active_conflict",
    });
    listPushRecords.mockResolvedValue([
      {
        subscription,
        plan,
        sentOn: "2026-09-28",
        sent: ["2026-09-28|pickup|07:10|Zatonie"],
        scheduleFingerprint: schoolScheduleFingerprint(baseSchedule),
        kinds: { departure: true, return: false, schedule: true },
      },
    ]);
    sendPush.mockResolvedValue("ok");
    savePushRecord.mockResolvedValue(undefined);

    const { dispatchReminders } = await import("./dispatch");
    // 07:10 within 20 min of override 7:25
    await dispatchReminders(new Date("2026-09-28T07:10:00+02:00"));

    expect(sendPush).toHaveBeenCalledWith(
      subscription,
      expect.objectContaining({
        title: "Rozkład jazdy zaktualizowany",
      }),
    );
    expect(sendPush).toHaveBeenCalledWith(
      subscription,
      expect.objectContaining({
        title: "Odjazd do szkoły za 15 min",
        body: "Zatonie · 07:25",
      }),
    );
    expect(savePushRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduleFingerprint: schoolScheduleFingerprint(overrideSchedule),
        sentOn: "2026-09-28",
        sent: ["2026-09-28|pickup|07:25|Zatonie"],
      }),
    );
  });

  it("reports scrape as scheduleSource when no override is active", async () => {
    acquireDispatchLock.mockResolvedValue(true);
    loadScheduleSnapshot.mockResolvedValue({
      schedule: baseSchedule,
      source: "scrape",
      overrideStatus: "none",
    });
    listPushRecords.mockResolvedValue([]);

    const { dispatchReminders } = await import("./dispatch");
    const summary = await dispatchReminders(
      new Date("2026-09-28T10:00:00+02:00"),
    );

    expect(summary).toEqual({
      checked: 0,
      sent: 0,
      removed: 0,
      skipped: null,
      scheduleSource: "scrape",
    });
  });
});
