import type { MzkSchedule, MzkScheduleMetaFile } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

/** Lightweight shape guard — corrupt snapshots soft-fail instead of 500. */
export function isMzkScheduleSnapshot(value: unknown): value is MzkSchedule {
  if (!isRecord(value)) return false;
  if (typeof value.fetchedAt !== "string") return false;
  if (!Array.isArray(value.stops) || !Array.isArray(value.trips)) return false;
  if (!isRecord(value.serviceDates)) return false;
  if (typeof value.feedEndDate !== "string") return false;
  return true;
}

/** Shape guard for the MZK meta sidecar. */
export function isMzkScheduleMeta(
  value: unknown,
): value is MzkScheduleMetaFile {
  if (!isRecord(value)) return false;
  return (
    typeof value.sourceUrl === "string" &&
    typeof value.attribution === "string" &&
    typeof value.fetchedAt === "string" &&
    typeof value.feedStartDate === "string" &&
    typeof value.feedEndDate === "string" &&
    typeof value.stopCount === "number" &&
    typeof value.tripCount === "number"
  );
}
