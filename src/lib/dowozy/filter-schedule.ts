import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import { accountPlanLabel, fromAccountPlan } from "@/lib/child-schedule/account-plan";
import type { ChildLessonPlan, WeekdayKey } from "@/lib/child-schedule/types";
import {
  dropoffFitsLessonEnd,
  getDayTimes,
  pickupFitsLessonStart,
  timeToMinutes,
} from "@/lib/child-schedule/match";
import { DEFAULT_LESSON_MATCH_WINDOW_MIN } from "@/lib/child-schedule/match-window";
import type {
  Course,
  DayDropoff,
  DriverBlock,
  Schedule,
  Stop,
  WeekdayDropoff,
} from "./types";
import {
  courseAllowedOnWeekday,
  dateLabelMatchesTarget,
  extractYearFromPeriod,
  isSchoolDay,
  resolveTargetDay,
  type ScheduleDateFilter,
} from "./schedule-dates";

export type { ScheduleDateFilter } from "./schedule-dates";

/** Stop with optional plan labels (extra field; Schedule still typed as Stop[]). */
export type AnnotatedStop = Stop & { planLabels?: string[] };

export type LessonMatchPlan = {
  label: string;
  place: string;
  days: ChildLessonPlan["days"];
};

export function lessonMatchPlansFromAccount(
  plans: AccountPlan[],
): LessonMatchPlan[] {
  return plans.map((plan, index) => ({
    label: accountPlanLabel(plan, index),
    place: plan.place,
    days: fromAccountPlan(plan).days,
  }));
}

export function lessonMatchPlanFromLocal(
  plan: ChildLessonPlan,
): LessonMatchPlan | null {
  if (!plan.place?.trim()) return null;
  return {
    label: plan.place.trim(),
    place: plan.place.trim(),
    days: plan.days,
  };
}

function stopIncludesPlace(stop: Stop, place: string): boolean {
  return stop.places.some((p) => p === place);
}

function stopMatchesPlaces(stop: Stop, places: string[] | null): boolean {
  if (!places || places.length === 0) return true;
  return places.some((place) => stopIncludesPlace(stop, place));
}

function narrowStopToPlaces(stop: Stop, places: string[] | null): Stop {
  if (!places || places.length === 0) return stop;
  return { ...stop, places: stop.places.filter((p) => places.includes(p)) };
}

/** Earliest valid clock time among strings; invalid times sort last. */
function earliestMinutes(times: string[]): number {
  let min = Number.POSITIVE_INFINITY;
  for (const time of times) {
    const minutes = timeToMinutes(time);
    if (minutes !== null && minutes < min) min = minutes;
  }
  return min;
}

function compareByMinutes(a: number, b: number): number {
  return a - b;
}

function courseFirstStopMinutes(course: Course): number {
  return earliestMinutes(course.stops.map((stop) => stop.time));
}

function sortPickupBlock(block: DriverBlock): DriverBlock {
  const courses = [...block.courses].sort((a, b) =>
    compareByMinutes(courseFirstStopMinutes(a), courseFirstStopMinutes(b)),
  );
  return { ...block, courses };
}

function pickupBlockMinutes(block: DriverBlock): number {
  return earliestMinutes(
    block.courses.flatMap((course) => course.stops.map((stop) => stop.time)),
  );
}

function sortRuns(runs: Stop[]): Stop[] {
  return [...runs].sort((a, b) =>
    compareByMinutes(
      timeToMinutes(a.time) ?? Number.POSITIVE_INFINITY,
      timeToMinutes(b.time) ?? Number.POSITIVE_INFINITY,
    ),
  );
}

function sortDayDropoff(day: DayDropoff): DayDropoff {
  return { ...day, runs: sortRuns(day.runs) };
}

function dayDropoffMinutes(day: DayDropoff): number {
  return earliestMinutes(day.runs.map((run) => run.time));
}

function sortWeekdayDropoff(block: WeekdayDropoff): WeekdayDropoff {
  return { ...block, runs: sortRuns(block.runs) };
}

function weekdayDropoffMinutes(block: WeekdayDropoff): number {
  return earliestMinutes(block.runs.map((run) => run.time));
}

export function collectPlaces(schedule: Schedule): string[] {
  const places = new Set<string>();

  for (const block of schedule.pickups) {
    for (const course of block.courses) {
      for (const stop of course.stops) {
        for (const place of stop.places) places.add(place);
      }
    }
  }

  for (const day of schedule.dropoffsByDate) {
    for (const run of day.runs) {
      for (const place of run.places) places.add(place);
    }
  }

  for (const block of schedule.dropoffsWeekday) {
    for (const run of block.runs) {
      for (const place of run.places) places.add(place);
    }
  }

  return [...places].sort((a, b) => a.localeCompare(b, "pl"));
}

function resolvePlaces(options: {
  places?: string[] | null;
  place?: string | null;
}): string[] | null {
  if (options.places !== undefined) {
    return options.places && options.places.length > 0 ? options.places : null;
  }
  if (options.place) return [options.place];
  return null;
}

function resolveMatchPlans(options: {
  matchPlans?: LessonMatchPlan[] | null;
  lessonPlan?: ChildLessonPlan | null;
  matchLessonPlan?: boolean;
}): LessonMatchPlan[] | null {
  if (!options.matchLessonPlan) return null;
  if (options.matchPlans && options.matchPlans.length > 0) {
    return options.matchPlans;
  }
  if (options.lessonPlan) {
    const single = lessonMatchPlanFromLocal(options.lessonPlan);
    return single ? [single] : null;
  }
  return null;
}

function dayTimesForPlan(
  plan: LessonMatchPlan,
  weekday: number | null,
): { start?: string; end?: string } | undefined {
  if (weekday === null) return undefined;
  return getDayTimes(
    { place: plan.place, days: plan.days },
    weekday as WeekdayKey,
  );
}

function annotatePickupStop(
  stop: Stop,
  places: string[] | null,
  matchPlans: LessonMatchPlan[] | null,
  weekday: number | null,
  windowMin: number,
): AnnotatedStop | null {
  if (!stopMatchesPlaces(stop, places)) return null;

  if (!matchPlans) {
    return narrowStopToPlaces(stop, places);
  }

  const labels: string[] = [];
  const matchedPlaces = new Set<string>();
  for (const plan of matchPlans) {
    const times = dayTimesForPlan(plan, weekday);
    if (!times?.start) continue;
    if (!stopIncludesPlace(stop, plan.place)) continue;
    if (places && places.length > 0 && !places.includes(plan.place)) continue;
    if (!pickupFitsLessonStart(stop.time, times.start, windowMin)) continue;
    labels.push(plan.label);
    matchedPlaces.add(plan.place);
  }

  if (labels.length === 0) return null;

  const nextPlaces = stop.places.filter((p) => matchedPlaces.has(p));
  const annotated: AnnotatedStop = {
    ...stop,
    places: nextPlaces.length > 0 ? nextPlaces : [...matchedPlaces],
    planLabels: labels,
  };
  return annotated;
}

function annotateDropoffStop(
  stop: Stop,
  places: string[] | null,
  matchPlans: LessonMatchPlan[] | null,
  weekday: number | null,
  windowMin: number,
): AnnotatedStop | null {
  if (!stopMatchesPlaces(stop, places)) return null;

  if (!matchPlans) {
    return narrowStopToPlaces(stop, places);
  }

  const labels: string[] = [];
  const matchedPlaces = new Set<string>();
  for (const plan of matchPlans) {
    const times = dayTimesForPlan(plan, weekday);
    if (!times?.end) continue;
    if (!stopIncludesPlace(stop, plan.place)) continue;
    if (places && places.length > 0 && !places.includes(plan.place)) continue;
    if (!dropoffFitsLessonEnd(stop.time, times.end, windowMin)) continue;
    labels.push(plan.label);
    matchedPlaces.add(plan.place);
  }

  if (labels.length === 0) return null;

  const nextPlaces = stop.places.filter((p) => matchedPlaces.has(p));
  const annotated: AnnotatedStop = {
    ...stop,
    places: nextPlaces.length > 0 ? nextPlaces : [...matchedPlaces],
    planLabels: labels,
  };
  return annotated;
}

function anyPlanHasDayTimes(
  matchPlans: LessonMatchPlan[],
  weekday: number,
): boolean {
  return matchPlans.some((plan) => Boolean(dayTimesForPlan(plan, weekday)));
}

function filterPickupBlock(
  block: DriverBlock,
  places: string[] | null,
  weekday: number | null,
  matchPlans: LessonMatchPlan[] | null,
  windowMin: number,
): DriverBlock | null {
  let courses = block.courses;

  if (weekday !== null) {
    courses = courses.filter((course) =>
      courseAllowedOnWeekday(course.note, weekday),
    );
  }

  if (places || matchPlans) {
    courses = courses
      .map((course) => {
        const stops = course.stops
          .map((stop) =>
            annotatePickupStop(stop, places, matchPlans, weekday, windowMin),
          )
          .filter((stop): stop is AnnotatedStop => stop !== null);
        if (!stops.length) return null;
        return { ...course, stops };
      })
      .filter((course): course is Course => course !== null);
  }

  if (!courses.length) return null;
  return { ...block, courses };
}

function filterRuns(
  runs: Stop[],
  places: string[] | null,
  matchPlans: LessonMatchPlan[] | null,
  weekday: number | null,
  windowMin: number,
): AnnotatedStop[] {
  return runs
    .map((run) =>
      annotateDropoffStop(run, places, matchPlans, weekday, windowMin),
    )
    .filter((run): run is AnnotatedStop => run !== null);
}

function filterDayDropoff(
  day: DayDropoff,
  places: string[] | null,
  matchPlans: LessonMatchPlan[] | null,
  weekday: number | null,
  windowMin: number,
): DayDropoff | null {
  const runs = filterRuns(day.runs, places, matchPlans, weekday, windowMin);
  if (!runs.length) return null;
  return { ...day, runs };
}

function filterWeekdayDropoff(
  block: WeekdayDropoff,
  places: string[] | null,
  matchPlans: LessonMatchPlan[] | null,
  weekday: number | null,
  windowMin: number,
): WeekdayDropoff | null {
  const runs = filterRuns(block.runs, places, matchPlans, weekday, windowMin);
  if (!runs.length) return null;
  return { ...block, runs };
}

export type ScheduleDirection = "all" | "pickups" | "dropoffs";

export type FilterScheduleOptions = {
  /** Preferred: null / empty = all places. */
  places?: string[] | null;
  /** @deprecated Prefer `places`. Single place when `places` is omitted. */
  place?: string | null;
  direction: ScheduleDirection;
  dateFilter?: ScheduleDateFilter;
  now?: Date;
  lessonPlan?: ChildLessonPlan | null;
  /** When set with matchLessonPlan, OR-match these plans (labels on stops). */
  matchPlans?: LessonMatchPlan[] | null;
  matchLessonPlan?: boolean;
  lessonMatchWindowMin?: number;
};

export function filterSchedule(
  schedule: Schedule,
  options: FilterScheduleOptions,
): Schedule {
  const {
    direction,
    dateFilter = "all",
    now = new Date(),
    lessonMatchWindowMin = DEFAULT_LESSON_MATCH_WINDOW_MIN,
  } = options;
  const places = resolvePlaces(options);
  const matchPlans = resolveMatchPlans(options);
  const showPickups = direction === "all" || direction === "pickups";
  const showDropoffs = direction === "all" || direction === "dropoffs";
  const target = resolveTargetDay(dateFilter, now);
  const periodYear = extractYearFromPeriod(schedule.periodLabel);
  const weekday = target?.weekday ?? null;

  // When matching plan(s) on a day without configured hours, hide school-day trips.
  const planBlocksDay =
    Boolean(matchPlans) &&
    target !== null &&
    isSchoolDay(target.weekday) &&
    !anyPlanHasDayTimes(matchPlans!, target.weekday);

  const pickups =
    showPickups &&
    !planBlocksDay &&
    (target === null || isSchoolDay(target.weekday))
      ? schedule.pickups
          .map((block) =>
            filterPickupBlock(
              block,
              places,
              weekday,
              matchPlans,
              lessonMatchWindowMin,
            ),
          )
          .filter((block): block is DriverBlock => block !== null)
          .map(sortPickupBlock)
          .sort((a, b) =>
            compareByMinutes(pickupBlockMinutes(a), pickupBlockMinutes(b)),
          )
      : [];

  let dropoffsByDate =
    showDropoffs && !planBlocksDay ? schedule.dropoffsByDate : [];
  if (showDropoffs && target) {
    dropoffsByDate = dropoffsByDate.filter((day) =>
      dateLabelMatchesTarget(day.dateLabel, target, periodYear),
    );
  }
  dropoffsByDate = dropoffsByDate
    .map((day) =>
      filterDayDropoff(
        day,
        places,
        matchPlans,
        weekday,
        lessonMatchWindowMin,
      ),
    )
    .filter((day): day is DayDropoff => day !== null)
    .map(sortDayDropoff)
    .sort((a, b) =>
      compareByMinutes(dayDropoffMinutes(a), dayDropoffMinutes(b)),
    );

  let dropoffsWeekday =
    showDropoffs && !planBlocksDay ? schedule.dropoffsWeekday : [];
  if (showDropoffs && target && !isSchoolDay(target.weekday)) {
    dropoffsWeekday = [];
  }
  dropoffsWeekday = dropoffsWeekday
    .map((block) =>
      filterWeekdayDropoff(
        block,
        places,
        matchPlans,
        weekday,
        lessonMatchWindowMin,
      ),
    )
    .filter((block): block is WeekdayDropoff => block !== null)
    .map(sortWeekdayDropoff)
    .sort((a, b) =>
      compareByMinutes(weekdayDropoffMinutes(a), weekdayDropoffMinutes(b)),
    );

  return {
    ...schedule,
    pickups,
    dropoffsByDate,
    dropoffsWeekday,
  };
}

export function countVisibleTrips(schedule: Schedule): number {
  const pickupStops = schedule.pickups.reduce(
    (sum, block) =>
      sum + block.courses.reduce((s, course) => s + course.stops.length, 0),
    0,
  );
  const dayRuns = schedule.dropoffsByDate.reduce(
    (sum, day) => sum + day.runs.length,
    0,
  );
  const weekdayRuns = schedule.dropoffsWeekday.reduce(
    (sum, block) => sum + block.runs.length,
    0,
  );
  return pickupStops + dayRuns + weekdayRuns;
}
