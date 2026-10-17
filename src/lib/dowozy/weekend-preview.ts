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
  /** Display label when preview came from one of several account plans. */
  planLabel?: string;
};

export type MondayPreviewPlanEntry = {
  plan: ChildLessonPlan;
  label?: string;
  /** Stable account-plan index for UI switching. */
  index?: number;
};

export type NextMondayPlanPreview = NextSchoolDayPreview & {
  planIndex: number;
  planLabel: string;
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

/**
 * Monday previews for every plan that has a lesson start + matching pickup.
 */
export function listNextMondayPreviews(
  schedule: Schedule,
  plans: readonly MondayPreviewPlanEntry[],
  options?: {
    windowMin?: number;
    now?: Date;
  },
): NextMondayPlanPreview[] {
  const out: NextMondayPlanPreview[] = [];

  for (let i = 0; i < plans.length; i++) {
    const entry = plans[i]!;
    const preview = buildNextMondayPreview(schedule, entry.plan, {
      place: entry.plan.place,
      windowMin: options?.windowMin,
      now: options?.now,
    });
    if (!preview) continue;

    const planIndex = entry.index ?? i;
    const planLabel =
      entry.label?.trim() || `Plan ${planIndex + 1}`;
    out.push({ ...preview, planIndex, planLabel });
  }

  return out;
}

/**
 * First plan that has Monday lesson + matching pickup (legacy helper).
 */
export function buildNextMondayPreviewForPlans(
  schedule: Schedule,
  plans: readonly MondayPreviewPlanEntry[],
  options?: {
    windowMin?: number;
    now?: Date;
  },
): NextSchoolDayPreview | null {
  const [first] = listNextMondayPreviews(schedule, plans, options);
  if (!first) return null;
  const { planIndex: _planIndex, planLabel, ...rest } = first;
  return planLabel ? { ...rest, planLabel } : rest;
}
