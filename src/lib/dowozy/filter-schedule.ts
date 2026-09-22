import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import {
  dropoffFitsLessonEnd,
  getDayTimes,
  pickupFitsLessonStart,
} from "@/lib/child-schedule/match";
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

function stopIncludesPlace(stop: Stop, place: string): boolean {
  return stop.places.some((p) => p === place);
}

function narrowStopToPlace(stop: Stop, place: string): Stop {
  return { ...stop, places: stop.places.filter((p) => p === place) };
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

function filterPickupBlock(
  block: DriverBlock,
  place: string | null,
  weekday: number | null,
  lessonStart: string | null,
): DriverBlock | null {
  let courses = block.courses;

  if (weekday !== null) {
    courses = courses.filter((course) =>
      courseAllowedOnWeekday(course.note, weekday),
    );
  }

  if (place || lessonStart) {
    courses = courses
      .map((course) => {
        const stops = course.stops
          .filter((stop) => {
            if (place && !stopIncludesPlace(stop, place)) return false;
            if (lessonStart && !pickupFitsLessonStart(stop.time, lessonStart)) {
              return false;
            }
            return true;
          })
          .map((stop) => (place ? narrowStopToPlace(stop, place) : stop));
        if (!stops.length) return null;
        return { ...course, stops };
      })
      .filter((course): course is Course => course !== null);
  }

  if (!courses.length) return null;
  return { ...block, courses };
}

function filterRunsByPlaceAndEnd(
  runs: Stop[],
  place: string | null,
  lessonEnd: string | null,
): Stop[] {
  return runs
    .filter((run) => {
      if (place && !stopIncludesPlace(run, place)) return false;
      if (lessonEnd && !dropoffFitsLessonEnd(run.time, lessonEnd)) return false;
      return true;
    })
    .map((run) => (place ? narrowStopToPlace(run, place) : run));
}

function filterDayDropoff(
  day: DayDropoff,
  place: string | null,
  lessonEnd: string | null,
): DayDropoff | null {
  const runs = filterRunsByPlaceAndEnd(day.runs, place, lessonEnd);
  if (!runs.length) return null;
  return { ...day, runs };
}

function filterWeekdayDropoff(
  block: WeekdayDropoff,
  place: string | null,
  lessonEnd: string | null,
): WeekdayDropoff | null {
  const runs = filterRunsByPlaceAndEnd(block.runs, place, lessonEnd);
  if (!runs.length) return null;
  return { ...block, runs };
}

export type ScheduleDirection = "all" | "pickups" | "dropoffs";

export function filterSchedule(
  schedule: Schedule,
  options: {
    place: string | null;
    direction: ScheduleDirection;
    dateFilter?: ScheduleDateFilter;
    now?: Date;
    lessonPlan?: ChildLessonPlan | null;
    matchLessonPlan?: boolean;
  },
): Schedule {
  const {
    place,
    direction,
    dateFilter = "all",
    now = new Date(),
    lessonPlan = null,
    matchLessonPlan = false,
  } = options;
  const showPickups = direction === "all" || direction === "pickups";
  const showDropoffs = direction === "all" || direction === "dropoffs";
  const target = resolveTargetDay(dateFilter, now);
  const periodYear = extractYearFromPeriod(schedule.periodLabel);
  const weekday = target?.weekday ?? null;

  const dayTimes =
    matchLessonPlan && lessonPlan && weekday !== null
      ? getDayTimes(lessonPlan, weekday)
      : undefined;

  const lessonStart =
    matchLessonPlan && dayTimes?.start ? dayTimes.start : null;
  const lessonEnd =
    matchLessonPlan && dayTimes?.end ? dayTimes.end : null;

  // When matching plan on a day without configured hours, hide school-day trips.
  const planBlocksDay =
    matchLessonPlan &&
    target !== null &&
    isSchoolDay(target.weekday) &&
    !dayTimes;

  const pickups =
    showPickups &&
    !planBlocksDay &&
    (target === null || isSchoolDay(target.weekday))
      ? schedule.pickups
          .map((block) =>
            filterPickupBlock(block, place, weekday, lessonStart),
          )
          .filter((block): block is DriverBlock => block !== null)
      : [];

  let dropoffsByDate =
    showDropoffs && !planBlocksDay ? schedule.dropoffsByDate : [];
  if (showDropoffs && target) {
    dropoffsByDate = dropoffsByDate.filter((day) =>
      dateLabelMatchesTarget(day.dateLabel, target, periodYear),
    );
  }
  dropoffsByDate = dropoffsByDate
    .map((day) => filterDayDropoff(day, place, lessonEnd))
    .filter((day): day is DayDropoff => day !== null);

  let dropoffsWeekday =
    showDropoffs && !planBlocksDay ? schedule.dropoffsWeekday : [];
  if (showDropoffs && target && !isSchoolDay(target.weekday)) {
    dropoffsWeekday = [];
  }
  dropoffsWeekday = dropoffsWeekday
    .map((block) => filterWeekdayDropoff(block, place, lessonEnd))
    .filter((block): block is WeekdayDropoff => block !== null);

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
