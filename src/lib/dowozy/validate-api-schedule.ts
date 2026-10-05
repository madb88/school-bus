import type { DowozyApiModified, DowozyApiScheduleResponse } from "./types";
import { isScheduleSnapshot } from "./validate-schedule";

const ACTIVE_UNTIL_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function isDowozyApiModified(value: unknown): value is DowozyApiModified {
  if (!isRecord(value)) return false;
  if (typeof value.active !== "boolean") return false;

  if (value.activeUntil !== undefined) {
    if (typeof value.activeUntil !== "string") return false;
    if (
      value.activeUntil.trim() !== "" &&
      !ACTIVE_UNTIL_RE.test(value.activeUntil.trim())
    ) {
      return false;
    }
  }

  if (!("schedule" in value)) return true;
  if (value.schedule === null || value.schedule === undefined) return true;
  return isScheduleSnapshot(value.schedule);
}

/** Shape guard for GET /api/v1/dowozy/schedule. */
export function isDowozyApiScheduleResponse(
  value: unknown,
): value is DowozyApiScheduleResponse {
  if (!isRecord(value)) return false;
  if (!isScheduleSnapshot(value.original)) return false;
  return isDowozyApiModified(value.modified);
}
