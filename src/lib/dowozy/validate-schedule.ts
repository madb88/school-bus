import type { Schedule } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

/** Lightweight shape guard — corrupt snapshots soft-fail instead of 500. */
export function isScheduleSnapshot(value: unknown): value is Schedule {
  if (!isRecord(value)) return false;
  if (typeof value.fetchedAt !== "string") return false;
  if (!Array.isArray(value.pickups)) return false;
  if (!Array.isArray(value.dropoffsByDate)) return false;
  if (!Array.isArray(value.dropoffsWeekday)) return false;
  return true;
}
