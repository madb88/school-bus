import {
  formatTimeInput,
  timeToMinutes,
} from "@/lib/child-schedule/match";
import {
  WEEKDAY_OPTIONS,
  type ChildLessonPlan,
  type WeekdayKey,
} from "@/lib/child-schedule/types";
import { filterSchedule } from "./filter-schedule";
import type { Schedule } from "./types";

/** Monday–Friday of the posted September 2026 week, noon Europe/Warsaw. */
const WEEKDAY_ANCHORS: Record<WeekdayKey, Date> = {
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

export type WeeklyPrintDay = {
  weekday: WeekdayKey;
  label: string;
  lessonStart: string | null;
  lessonEnd: string | null;
  departures: string[];
  returns: string[];
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

export function buildWeeklyLessonPrint(
  schedule: Schedule,
  plan: ChildLessonPlan,
  windowMin: number,
): WeeklyPrintDay[] {
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

    return {
      weekday: key,
      label: SHORT_WEEKDAY[key],
      lessonStart: day?.start ? formatTimeInput(day.start) : null,
      lessonEnd: day?.end ? formatTimeInput(day.end) : null,
      departures: day?.start ? uniqueSortedTimes(departures) : [],
      returns: day?.end ? uniqueSortedTimes(returns) : [],
    };
  });
}
