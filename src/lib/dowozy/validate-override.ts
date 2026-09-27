import type { DowozyOverride } from "./types";
import { isScheduleSnapshot } from "./validate-schedule";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

/** True when string parses as a real instant (ISO 8601 with offset preferred). */
export function isValidIsoTimestamp(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  return !Number.isNaN(Date.parse(value));
}

/**
 * Shape guard for the overrides file.
 * Inactive placeholders may use empty createdAt/expiresAt and schedule: null.
 * Active entries should carry a valid createdAt; a missing/invalid schedule is
 * still accepted here so resolve can soft-fall back to the scrape snapshot.
 */
export function isDowozyOverride(value: unknown): value is DowozyOverride {
  if (!isRecord(value)) return false;
  if (typeof value.active !== "boolean") return false;
  if (typeof value.reason !== "string") return false;
  if (typeof value.createdAt !== "string") return false;
  if (!("schedule" in value)) return false;

  if (value.expiresAt !== undefined && typeof value.expiresAt !== "string") {
    return false;
  }
  if (
    typeof value.expiresAt === "string" &&
    value.expiresAt.trim() !== "" &&
    !isValidIsoTimestamp(value.expiresAt)
  ) {
    return false;
  }

  if (value.active && value.createdAt.trim() !== "") {
    if (!isValidIsoTimestamp(value.createdAt)) return false;
  }

  if (value.schedule === null) return true;
  return isScheduleSnapshot(value.schedule);
}
