import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { dueTripsForPlan, warsawDateKey } from "./due-trips";
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

async function notifyRecord(
  record: PushRecord,
  schedule: NonNullable<Awaited<ReturnType<typeof loadScheduleSnapshot>>>,
  today: string,
  now: Date,
): Promise<{ sent: number; removed: boolean }> {
  const due = dueTripsForPlan(schedule, record.plan, now);
  const already = new Set(record.sentOn === today ? record.sent : []);
  const pending = due.filter((trip) => !already.has(trip.id));
  if (!pending.length) return { sent: 0, removed: false };

  let sent = 0;
  for (const trip of pending) {
    const result = await sendPush(record.subscription, {
      title: trip.title,
      body: trip.body,
      url: trip.url,
    });

    if (result === "gone") {
      await deletePushRecord(subscriptionId(record.subscription.endpoint));
      return { sent, removed: true };
    }

    if (result === "ok") {
      already.add(trip.id);
      sent += 1;
    }
  }

  if (sent > 0) {
    await savePushRecord({
      ...record,
      sentOn: today,
      sent: [...already],
    });
  }

  return { sent, removed: false };
}
