import {
  dropoffFitsLessonEnd,
  formatTimeInput,
  pickupFitsLessonStart,
  timeToMinutes,
} from "@/lib/child-schedule/match";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import {
  buildMergedTimeline,
  type TimelineEntry,
} from "@/lib/mzk/merge-timeline";
import type { MzkOdDeparture } from "@/lib/mzk/types";
import { filterSchedule, type ScheduleDateFilter } from "./filter-schedule";
import type { ScheduleSourceMode } from "./filter-url";
import type { Schedule } from "./types";

const MZK_DROPOFF_CUTOFF_MIN = 18 * 60;

export type BestTodayTrip = {
  id: string;
  time: string;
  source: "school" | "mzk";
  direction: "pickup" | "dropoff";
  /** Place name (school) or board → alight path (MZK). */
  label: string;
  /** MZK line number for the badge (e.g. "30"). */
  route?: string;
};

export type BestTodayRecommendation = {
  pickup: BestTodayTrip | null;
  dropoff: BestTodayTrip | null;
  lessonStart: string | null;
  lessonEnd: string | null;
};

function tripFromEntry(entry: TimelineEntry, index: number): BestTodayTrip {
  if (entry.kind === "school") {
    return {
      id: entry.stopId,
      time: formatTimeInput(entry.time),
      source: "school",
      direction: entry.direction,
      label: entry.places.join(", "),
    };
  }

  return {
    id: `mzk-${entry.departure.departTime}-${entry.departure.route}-${index}`,
    time: formatTimeInput(entry.time),
    source: "mzk",
    direction: entry.direction,
    label: `${entry.departure.boardStopName} → ${entry.departure.alightStopName}`,
    route: entry.departure.route,
  };
}

/** Closest to lesson start among matching morning trips (latest arrival-ish time). */
function bestPickup(entries: TimelineEntry[]): BestTodayTrip | null {
  let best: BestTodayTrip | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  entries.forEach((entry, index) => {
    const score =
      entry.kind === "school"
        ? timeToMinutes(entry.time)
        : timeToMinutes(entry.departure.arriveTime);
    if (score === null || score <= bestScore) return;
    bestScore = score;
    best = tripFromEntry(entry, index);
  });

  return best;
}

/** Closest to lesson end among matching afternoon trips (earliest departure). */
function bestDropoff(entries: TimelineEntry[]): BestTodayTrip | null {
  let best: BestTodayTrip | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  entries.forEach((entry, index) => {
    const score = timeToMinutes(entry.time);
    if (score === null || score >= bestScore) return;
    bestScore = score;
    best = tripFromEntry(entry, index);
  });

  return best;
}

function filterMzkPickupsForPlan(
  pickups: MzkOdDeparture[],
  lessonStart: string,
  windowMin: number,
): MzkOdDeparture[] {
  return pickups.filter((departure) =>
    pickupFitsLessonStart(departure.arriveTime, lessonStart, windowMin),
  );
}

function filterMzkDropoffsForPlan(
  dropoffs: MzkOdDeparture[],
  lessonEnd: string,
  windowMin: number,
): MzkOdDeparture[] {
  return dropoffs.filter((departure) => {
    const minutes = timeToMinutes(departure.departTime);
    if (minutes === null || minutes > MZK_DROPOFF_CUTOFF_MIN) return false;
    return dropoffFitsLessonEnd(departure.departTime, lessonEnd, windowMin);
  });
}

/**
 * Plan-aware recommendation for today: latest fitting morning trip and
 * earliest fitting afternoon trip (school only, or school + MZK).
 */
export function buildBestTodayRecommendation(options: {
  schedule: Schedule;
  place: string | null;
  dateFilter: ScheduleDateFilter;
  now?: Date;
  lessonPlan: ChildLessonPlan | null | undefined;
  windowMin: number;
  sourceMode: ScheduleSourceMode;
  lessonStart: string | null | undefined;
  lessonEnd: string | null | undefined;
  mzkPickups?: MzkOdDeparture[];
  mzkDropoffs?: MzkOdDeparture[];
}): BestTodayRecommendation | null {
  const {
    schedule,
    place,
    dateFilter,
    now = new Date(),
    lessonPlan,
    windowMin,
    sourceMode,
    lessonStart,
    lessonEnd,
    mzkPickups = [],
    mzkDropoffs = [],
  } = options;

  if (!lessonPlan || (!lessonStart && !lessonEnd)) return null;

  const filtered = filterSchedule(schedule, {
    place,
    direction: "all",
    dateFilter,
    now,
    lessonPlan,
    matchLessonPlan: true,
    lessonMatchWindowMin: windowMin,
  });

  const includeMzk = sourceMode === "school-mzk";
  const timeline = buildMergedTimeline({
    schedule: filtered,
    mzkPickups:
      includeMzk && lessonStart
        ? filterMzkPickupsForPlan(mzkPickups, lessonStart, windowMin)
        : [],
    mzkDropoffs:
      includeMzk && lessonEnd
        ? filterMzkDropoffsForPlan(mzkDropoffs, lessonEnd, windowMin)
        : [],
    direction: "all",
  });

  const pickup = lessonStart ? bestPickup(timeline.pickups) : null;
  const dropoff = lessonEnd ? bestDropoff(timeline.dropoffs) : null;

  if (!pickup && !dropoff) return null;

  return {
    pickup,
    dropoff,
    lessonStart: lessonStart ? formatTimeInput(lessonStart) : null,
    lessonEnd: lessonEnd ? formatTimeInput(lessonEnd) : null,
  };
}
