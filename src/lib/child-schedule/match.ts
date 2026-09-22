import type { ChildLessonPlan, WeekdayKey } from "./types";

/** Max minutes before lesson start for a matching morning pickup/arrival. */
export const PICKUP_WINDOW_BEFORE_START_MIN = 90;

/** Max minutes after lesson end for a matching afternoon dropoff departure. */
export const DROPOFF_WINDOW_AFTER_END_MIN = 90;

/** "8:00" / "08:00" → minutes from midnight */
export function timeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatTimeInput(time: string): string {
  const minutes = timeToMinutes(time);
  if (minutes === null) return time;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getDayTimes(
  plan: ChildLessonPlan,
  weekday: number,
): ChildLessonPlan["days"][WeekdayKey] | undefined {
  if (weekday < 1 || weekday > 5) return undefined;
  return plan.days[weekday as WeekdayKey];
}

/**
 * Morning trip fits if it happens before lessons start, but not earlier
 * than `windowMin` minutes before start (default 90).
 */
export function pickupFitsLessonStart(
  stopTime: string,
  lessonStart: string,
  windowMin: number = PICKUP_WINDOW_BEFORE_START_MIN,
): boolean {
  const stop = timeToMinutes(stopTime);
  const start = timeToMinutes(lessonStart);
  if (stop === null || start === null) return false;
  if (stop >= start) return false;
  return stop >= start - windowMin;
}

/**
 * Afternoon trip fits if it leaves at/after lessons end, but not later
 * than `windowMin` minutes after end (default 90).
 */
export function dropoffFitsLessonEnd(
  runTime: string,
  lessonEnd: string,
  windowMin: number = DROPOFF_WINDOW_AFTER_END_MIN,
): boolean {
  const run = timeToMinutes(runTime);
  const end = timeToMinutes(lessonEnd);
  if (run === null || end === null) return false;
  if (run < end) return false;
  return run <= end + windowMin;
}
