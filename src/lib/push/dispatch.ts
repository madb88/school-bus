import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { dueTripsForPlan, warsawDateKey } from "./due-trips";
import { schoolScheduleFingerprint } from "./schedule-fingerprint";
import { sendPush } from "./send";
import {
  acquireDispatchLock,
  deletePushRecord,
  listPushRecords,
  releaseDispatchLock,
  savePushRecord,
  subscriptionId,
  type PushRecord,
} from "./store";

export type DispatchSummary = {
  checked: number;
  sent: number;
  removed: number;
  skipped: "no-schedule" | "locked" | null;
};

export async function dispatchReminders(
  now: Date = new Date(),
): Promise<DispatchSummary> {
  const locked = await acquireDispatchLock();
  if (!locked) {
    return { checked: 0, sent: 0, removed: 0, skipped: "locked" };
  }

  try {
    const schedule = await loadScheduleSnapshot();
    if (!schedule) {
      return { checked: 0, sent: 0, removed: 0, skipped: "no-schedule" };
    }

    const records = await listPushRecords();
    const today = warsawDateKey(now);
    let sent = 0;
    let removed = 0;

    for (const record of records) {
      const outcome = await notifyRecord(record, schedule, today, now);
      sent += outcome.sent;
      if (outcome.removed) removed += 1;
    }

    return { checked: records.length, sent, removed, skipped: null };
  } finally {
    await releaseDispatchLock();
  }
}

const SCHEDULE_UPDATED = {
  title: "Rozkład jazdy zaktualizowany",
  body: "Godziny dowozów i odwozów się zmieniły. Sprawdź swój kurs.",
  url: "/",
};

async function notifyRecord(
  record: PushRecord,
  schedule: NonNullable<Awaited<ReturnType<typeof loadScheduleSnapshot>>>,
  today: string,
  now: Date,
): Promise<{ sent: number; removed: boolean }> {
  let next = record;
  let sent = 0;
  let fingerprintDirty = false;
  const fingerprint = schoolScheduleFingerprint(schedule);

  if (!next.scheduleFingerprint || !next.kinds.schedule) {
    if (next.scheduleFingerprint !== fingerprint) {
      next = { ...next, scheduleFingerprint: fingerprint };
      fingerprintDirty = true;
    }
  } else if (next.scheduleFingerprint !== fingerprint) {
    const result = await sendPush(next.subscription, SCHEDULE_UPDATED);
    if (result === "gone") {
      await deletePushRecord(subscriptionId(next.subscription.endpoint));
      return { sent, removed: true };
    }
    if (result === "ok") {
      next = { ...next, scheduleFingerprint: fingerprint };
      fingerprintDirty = true;
      sent += 1;
    }
  }

  const due = dueTripsForPlan(schedule, next.plan, now).filter((trip) =>
    trip.kind === "pickup" ? next.kinds.departure : next.kinds.return,
  );
  const already = new Set(next.sentOn === today ? next.sent : []);
  const pending = due.filter((trip) => !already.has(trip.id));
  let tripsSent = 0;

  for (const trip of pending) {
    const result = await sendPush(next.subscription, {
      title: trip.title,
      body: trip.body,
      url: trip.url,
    });

    if (result === "gone") {
      await deletePushRecord(subscriptionId(next.subscription.endpoint));
      return { sent, removed: true };
    }

    if (result === "ok") {
      already.add(trip.id);
      tripsSent += 1;
      sent += 1;
    }
  }

  if (fingerprintDirty || tripsSent > 0) {
    await savePushRecord({
      ...next,
      ...(tripsSent > 0 ? { sentOn: today, sent: [...already] } : {}),
    });
  }

  return { sent, removed: false };
}
