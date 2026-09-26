import {
  formatTimeInput,
  getDayTimes,
  timeToMinutes,
} from "@/lib/child-schedule/match";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import { DEFAULT_LESSON_MATCH_WINDOW_MIN } from "@/lib/child-schedule/match-window";
import { filterSchedule } from "./filter-schedule";
import {
  formatDayOptionLabel,
  nextMonday,
  toAbsoluteYmd,
  WEEKDAYS_PL,
  type AbsoluteYmd,
} from "./schedule-dates";
import type { Schedule } from "./types";

export type NextSchoolDayPreview = {
  ymd: AbsoluteYmd;
  weekdayName: string;
  dayLabel: string;
  lessonStart: string;
  busTime: string;
};

function earliestPickupTime(schedule: Schedule): string | null {
  let best: string | null = null;
  let bestMinutes = Number.POSITIVE_INFINITY;

  for (const block of schedule.pickups) {
    for (const course of block.courses) {
      for (const stop of course.stops) {
        const minutes = timeToMinutes(stop.time);
        if (minutes === null || minutes >= bestMinutes) continue;
        best = stop.time;
        bestMinutes = minutes;
      }
    }
  }

  return best;
}

/**
 * Weekend home card: next Monday lesson start + earliest matching school pickup.
 * Returns null when there is no plan for Monday or no matching bus.
 */
export function buildNextMondayPreview(
  schedule: Schedule,
  plan: ChildLessonPlan | null | undefined,
  options?: {
    place?: string | null;
    windowMin?: number;
    now?: Date;
  },
): NextSchoolDayPreview | null {
  if (!plan) return null;

  const now = options?.now ?? new Date();
  const monday = nextMonday(now);
  const dayTimes = getDayTimes(plan, monday.weekday);
  if (!dayTimes?.start) return null;

  const ymd = toAbsoluteYmd(monday);
  const place = options?.place !== undefined ? options.place : plan.place;
  const windowMin = options?.windowMin ?? DEFAULT_LESSON_MATCH_WINDOW_MIN;

  const filtered = filterSchedule(schedule, {
    place,
    direction: "pickups",
    dateFilter: ymd,
    now,
    lessonPlan: plan,
    matchLessonPlan: true,
    lessonMatchWindowMin: windowMin,
  });

  const busRaw = earliestPickupTime(filtered);
  if (!busRaw) return null;

  return {
    ymd,
    weekdayName: WEEKDAYS_PL[monday.weekday] ?? "Poniedziałek",
    dayLabel: formatDayOptionLabel(monday),
    lessonStart: formatTimeInput(dayTimes.start),
    busTime: formatTimeInput(busRaw),
  };
}
