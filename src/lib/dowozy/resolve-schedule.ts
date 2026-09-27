import { schoolScheduleFingerprint } from "@/lib/push/schedule-fingerprint";
import type {
  DowozyOverride,
  OverrideStatus,
  Schedule,
  ScheduleSnapshotResult,
} from "./types";
import { isScheduleSnapshot } from "./validate-schedule";
import { isValidIsoTimestamp } from "./validate-override";

export type ResolveScheduleInput = {
  base: Schedule;
  /** Parsed override, or null when file missing / intentionally absent. */
  override: DowozyOverride | null;
  /** Set when override JSON existed but failed validation. */
  overrideInvalid?: boolean;
  now?: Date;
};

function isExpired(expiresAt: string | undefined, now: Date): boolean {
  if (expiresAt === undefined || expiresAt.trim() === "") return false;
  if (!isValidIsoTimestamp(expiresAt)) return true;
  return now.getTime() >= Date.parse(expiresAt);
}

function compareStatus(base: Schedule, overrideSchedule: Schedule): OverrideStatus {
  const baseFp = schoolScheduleFingerprint(base);
  const overrideFp = schoolScheduleFingerprint(overrideSchedule);
  return baseFp === overrideFp
    ? "override_matches_source"
    : "override_active_conflict";
}

/**
 * Pure decision: which schedule is effective and why.
 * Invalid overrides never throw — caller should log; we fall back to base.
 */
export function resolveScheduleSnapshot(
  input: ResolveScheduleInput,
): ScheduleSnapshotResult {
  const now = input.now ?? new Date();
  const { base } = input;

  if (input.overrideInvalid) {
    return {
      schedule: base,
      source: "scrape",
      overrideStatus: "none",
    };
  }

  const override = input.override;
  if (!override || !override.active) {
    return {
      schedule: base,
      source: "scrape",
      overrideStatus: "none",
    };
  }

  if (isExpired(override.expiresAt, now)) {
    return {
      schedule: base,
      source: "scrape",
      overrideStatus: "override_expired",
      overrideReason: override.reason || undefined,
    };
  }

  if (!override.schedule || !isScheduleSnapshot(override.schedule)) {
    return {
      schedule: base,
      source: "scrape",
      overrideStatus: "none",
    };
  }

  const reason = override.reason.trim() || undefined;

  return {
    schedule: override.schedule,
    source: "override",
    overrideStatus: compareStatus(base, override.schedule),
    overrideReason: reason,
  };
}
