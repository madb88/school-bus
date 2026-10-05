import type { ResolveScheduleInput } from "./resolve-schedule";
import {
  addCalendarDays,
  getWarsawParts,
  partsFromYmd,
  toAbsoluteYmd,
  type AbsoluteYmd,
} from "./schedule-dates";
import type {
  DowozyApiModified,
  DowozyApiScheduleResponse,
  DowozyOverride,
  Schedule,
} from "./types";

/**
 * UTC ms for 00:00:00 on the given Europe/Warsaw calendar day.
 * Returns null when `ymd` is not a real calendar date.
 */
export function warsawStartOfDayMs(ymd: AbsoluteYmd): number | null {
  const target = partsFromYmd(ymd);
  if (!target) return null;

  let utc = Date.UTC(target.year, target.month, target.day, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const at = new Date(utc);
    const parts = getWarsawParts(at);
    const dayDeltaMs =
      Date.UTC(target.year, target.month, target.day) -
      Date.UTC(parts.year, parts.month, parts.day);
    if (dayDeltaMs !== 0) {
      utc += dayDeltaMs;
      continue;
    }

    const timeParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    }).formatToParts(at);
    const hour = Number(timeParts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(
      timeParts.find((p) => p.type === "minute")?.value ?? 0,
    );
    const second = Number(
      timeParts.find((p) => p.type === "second")?.value ?? 0,
    );
    const offsetMs = ((hour * 60 + minute) * 60 + second) * 1000;
    if (offsetMs === 0) return utc;
    utc -= offsetMs;
  }

  return utc;
}

/**
 * Inclusive `activeUntil` (YYYY-MM-DD, Warsaw) → ISO instant at the start of
 * the next Warsaw calendar day (first moment the override is expired).
 */
export function expiresAtAfterInclusiveWarsawDay(
  activeUntil: string,
): string | undefined {
  const trimmed = activeUntil.trim();
  if (!trimmed) return undefined;
  const day = partsFromYmd(trimmed);
  if (!day) return undefined;
  const nextYmd = toAbsoluteYmd(addCalendarDays(day, 1));
  const ms = warsawStartOfDayMs(nextYmd);
  if (ms === null) return undefined;
  return new Date(ms).toISOString();
}

export function mapApiModifiedToOverride(
  modified: DowozyApiModified | undefined,
): DowozyOverride | null {
  if (!modified?.active) {
    return {
      active: false,
      reason: "",
      createdAt: "",
      schedule: null,
    };
  }

  const schedule: Schedule | null =
    modified.schedule && typeof modified.schedule === "object"
      ? modified.schedule
      : null;

  const expiresAt =
    typeof modified.activeUntil === "string"
      ? expiresAtAfterInclusiveWarsawDay(modified.activeUntil)
      : undefined;

  return {
    active: true,
    reason: "",
    createdAt: "",
    ...(expiresAt ? { expiresAt } : {}),
    schedule,
  };
}

/** Map API payload into resolveScheduleSnapshot input. */
export function mapApiResponseToResolveInput(
  response: DowozyApiScheduleResponse,
): ResolveScheduleInput {
  return {
    base: response.original,
    override: mapApiModifiedToOverride(response.modified),
  };
}
