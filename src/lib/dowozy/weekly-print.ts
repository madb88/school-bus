import {
  dropoffFitsLessonEnd,
  formatTimeInput,
  pickupFitsLessonStart,
  timeToMinutes,
} from "@/lib/child-schedule/match";
import {
  WEEKDAY_OPTIONS,
  type ChildLessonPlan,
  type WeekdayKey,
} from "@/lib/child-schedule/types";
import { findOdDepartures } from "@/lib/mzk/filter-departures";
import type { MzkRoutePreference } from "@/lib/mzk/route-preference";
import type { MzkOdDeparture, MzkSchedule } from "@/lib/mzk/types";
import { filterSchedule } from "./filter-schedule";
import type { Schedule } from "./types";

/** Monday–Friday of the posted September 2026 week, noon Europe/Warsaw. */
export const WEEKDAY_ANCHORS: Record<WeekdayKey, Date> = {
  1: new Date("2026-09-07T12:00:00+02:00"),
  2: new Date("2026-09-08T12:00:00+02:00"),
  3: new Date("2026-09-09T12:00:00+02:00"),
  4: new Date("2026-09-10T12:00:00+02:00"),
  5: new Date("2026-09-11T12:00:00+02:00"),
};

const SHORT_WEEKDAY: Record<WeekdayKey, string> = {
  1: "Pon",
  2: "Wt",
  3: "Śr",
  4: "Czw",
  5: "Pt",
};

const MZK_DROPOFF_CUTOFF_MIN = 18 * 60;

export type WeeklyPrintMzkTrip = {
  /** Boarding time shown on the sheet. */
  time: string;
  route: string;
};

export type WeeklyPrintDay = {
  weekday: WeekdayKey;
  label: string;
  lessonStart: string | null;
  lessonEnd: string | null;
  departures: string[];
  returns: string[];
  /** Nearest MZK morning trip (latest arrival still before lessons). */
  mzkDeparture: WeeklyPrintMzkTrip | null;
  /** Nearest MZK afternoon trip (earliest departure after lessons). */
  mzkReturn: WeeklyPrintMzkTrip | null;
};

function uniqueSortedTimes(times: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const time of times) {
    const formatted = formatTimeInput(time);
    if (seen.has(formatted)) continue;
    seen.add(formatted);
    unique.push(formatted);
  }
  unique.sort(
    (a, b) =>
      (timeToMinutes(a) ?? Number.POSITIVE_INFINITY) -
      (timeToMinutes(b) ?? Number.POSITIVE_INFINITY),
  );
  return unique;
}

function toMzkTrip(departure: MzkOdDeparture): WeeklyPrintMzkTrip {
  return {
    time: formatTimeInput(departure.departTime),
    route: departure.route,
  };
}

/** Latest morning OD that still arrives before lesson start. */
export function nearestMorningMzk(
  pickups: MzkOdDeparture[],
  lessonStart: string,
  windowMin: number,
): WeeklyPrintMzkTrip | null {
  const matching = pickups.filter((d) =>
    pickupFitsLessonStart(d.arriveTime, lessonStart, windowMin),
  );
  const nearest = matching.at(-1);
  return nearest ? toMzkTrip(nearest) : null;
}

/** Earliest afternoon OD that leaves at/after lesson end (and by 18:00). */
export function nearestAfternoonMzk(
  dropoffs: MzkOdDeparture[],
  lessonEnd: string,
  windowMin: number,
): WeeklyPrintMzkTrip | null {
  const matching = dropoffs.filter((d) => {
    const minutes = timeToMinutes(d.departTime);
    if (minutes === null || minutes > MZK_DROPOFF_CUTOFF_MIN) return false;
    return dropoffFitsLessonEnd(d.departTime, lessonEnd, windowMin);
  });
  const nearest = matching.at(0);
  return nearest ? toMzkTrip(nearest) : null;
}

export function buildWeeklyLessonPrint(
  schedule: Schedule,
  plan: ChildLessonPlan,
  windowMin: number,
  options?: {
    mzkSchedule?: MzkSchedule | null;
    mzkRoute?: MzkRoutePreference | null;
  },
): WeeklyPrintDay[] {
  const mzkSchedule = options?.mzkSchedule ?? null;
  const mzkRoute = options?.mzkRoute ?? null;
  const includeMzk = Boolean(
    mzkSchedule && mzkRoute?.boardStopId && mzkRoute.alightStopId,
  );

  return WEEKDAY_OPTIONS.map(({ key }) => {
    const day = plan.days[key];
    const filtered = filterSchedule(schedule, {
      place: plan.place,
      direction: "all",
      dateFilter: "today",
      now: WEEKDAY_ANCHORS[key],
      lessonPlan: plan,
      matchLessonPlan: true,
      lessonMatchWindowMin: windowMin,
    });

    const departures = filtered.pickups.flatMap((block) =>
      block.courses.flatMap((course) =>
        course.stops.map((stop) => stop.time),
      ),
    );
    const returns = [
      ...filtered.dropoffsByDate.flatMap((dropoff) =>
        dropoff.runs.map((run) => run.time),
      ),
      ...filtered.dropoffsWeekday.flatMap((block) =>
        block.runs.map((run) => run.time),
      ),
    ];

    let mzkDeparture: WeeklyPrintMzkTrip | null = null;
    let mzkReturn: WeeklyPrintMzkTrip | null = null;

    if (includeMzk && mzkRoute && day?.start) {
      const pickups = findOdDepartures(
        mzkSchedule,
        mzkRoute.boardStopId,
        mzkRoute.alightStopId,
        "today",
        WEEKDAY_ANCHORS[key],
        mzkRoute.route,
      );
      mzkDeparture = nearestMorningMzk(pickups, day.start, windowMin);

      if (day.end) {
        const dropoffs = findOdDepartures(
          mzkSchedule,
          mzkRoute.alightStopId,
          mzkRoute.boardStopId,
          "today",
          WEEKDAY_ANCHORS[key],
          mzkRoute.route,
        );
        mzkReturn = nearestAfternoonMzk(dropoffs, day.end, windowMin);
      }
    }

    return {
      weekday: key,
      label: SHORT_WEEKDAY[key],
      lessonStart: day?.start ? formatTimeInput(day.start) : null,
      lessonEnd: day?.end ? formatTimeInput(day.end) : null,
      departures: day?.start ? uniqueSortedTimes(departures) : [],
      returns: day?.end ? uniqueSortedTimes(returns) : [],
      mzkDeparture,
      mzkReturn,
    };
  });
}
