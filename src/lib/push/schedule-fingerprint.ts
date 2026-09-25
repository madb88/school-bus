import { createHash } from "node:crypto";
import type { Schedule } from "@/lib/dowozy/types";

/**
 * Hash of the timetable itself. A fresh download of the same hours
 * keeps the same fingerprint, so subscribers are not pinged every scrape.
 */
export function schoolScheduleFingerprint(schedule: Schedule): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        periodLabel: schedule.periodLabel,
        pickups: schedule.pickups,
        dropoffsByDate: schedule.dropoffsByDate,
        dropoffsWeekday: schedule.dropoffsWeekday,
      }),
    )
    .digest("hex");
}
