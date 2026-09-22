import type { ChildLessonPlan, WeekdayKey } from "./types";

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

/** Pickup stop must be before lessons start (same morning). */
export function pickupFitsLessonStart(
  stopTime: string,
  lessonStart: string,
): boolean {
  const stop = timeToMinutes(stopTime);
  const start = timeToMinutes(lessonStart);
  if (stop === null || start === null) return false;
  return stop < start;
}

/** Dropoff departure should be at or after lessons end. */
export function dropoffFitsLessonEnd(
  runTime: string,
  lessonEnd: string,
): boolean {
  const run = timeToMinutes(runTime);
  const end = timeToMinutes(lessonEnd);
  if (run === null || end === null) return false;
  return run >= end;
}
