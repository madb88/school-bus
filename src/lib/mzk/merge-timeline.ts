import type { Schedule } from "@/lib/dowozy/types";
import type { ScheduleDirection } from "@/lib/dowozy/filter-schedule";
import { stopDomId } from "@/lib/dowozy/next-trip";
import { timeToMinutes } from "@/lib/child-schedule/match";
import { getWarsawParts } from "@/lib/dowozy/schedule-dates";
import type { MzkOdDeparture } from "@/lib/mzk/types";

export type TimelineDirection = "pickup" | "dropoff";

export type SchoolTimelineEntry = {
  kind: "school";
  time: string;
  direction: TimelineDirection;
  stopId: string;
  places: string[];
  context: string;
};

export type MzkTimelineEntry = {
  kind: "mzk";
  time: string;
  direction: TimelineDirection;
  departure: MzkOdDeparture;
};

export type TimelineEntry = SchoolTimelineEntry | MzkTimelineEntry;

function entryTimeMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function sortByTime(a: TimelineEntry, b: TimelineEntry): number {
  return entryTimeMinutes(a.time) - entryTimeMinutes(b.time);
}

/**
 * Merge school + MZK into one timeline.
 * `mzkPickups` = saved board→alight (do szkoły).
 * `mzkDropoffs` = reversed alight→board (do domu).
 */
export function buildMergedTimeline(options: {
  schedule: Schedule;
  mzkPickups: MzkOdDeparture[];
  mzkDropoffs: MzkOdDeparture[];
  direction: ScheduleDirection;
}): { pickups: TimelineEntry[]; dropoffs: TimelineEntry[] } {
  const { schedule, mzkPickups, mzkDropoffs, direction } = options;

  const pickups: TimelineEntry[] = [];
  const dropoffs: TimelineEntry[] = [];

  if (direction === "all" || direction === "pickups") {
    for (const block of schedule.pickups) {
      for (const course of block.courses) {
        for (let index = 0; index < course.stops.length; index++) {
          const stop = course.stops[index];
          pickups.push({
            kind: "school",
            time: stop.time,
            direction: "pickup",
            stopId: stopDomId("pickup", [
              block.name,
              course.label,
              String(index),
              stop.time,
            ]),
            places: stop.places,
            context: `${block.name} · ${course.label}`,
          });
        }
      }
    }

    for (const departure of mzkPickups) {
      pickups.push({
        kind: "mzk",
        time: departure.departTime,
        direction: "pickup",
        departure,
      });
    }
  }

  if (direction === "all" || direction === "dropoffs") {
    for (const day of schedule.dropoffsByDate) {
      for (let index = 0; index < day.runs.length; index++) {
        const run = day.runs[index];
        dropoffs.push({
          kind: "school",
          time: run.time,
          direction: "dropoff",
          stopId: stopDomId("dropoff-date", [
            day.dateLabel,
            String(index),
            run.time,
          ]),
          places: run.places,
          context: `${day.dateLabel} · ${day.driver}`,
        });
      }
    }
    for (const block of schedule.dropoffsWeekday) {
      for (let index = 0; index < block.runs.length; index++) {
        const run = block.runs[index];
        dropoffs.push({
          kind: "school",
          time: run.time,
          direction: "dropoff",
          stopId: stopDomId("dropoff-weekday", [
            block.driver,
            String(index),
            run.time,
          ]),
          places: run.places,
          context: `${block.title} · ${block.driver}`,
        });
      }
    }

    for (const departure of mzkDropoffs) {
      dropoffs.push({
        kind: "mzk",
        time: departure.departTime,
        direction: "dropoff",
        departure,
      });
    }
  }

  pickups.sort(sortByTime);
  dropoffs.sort(sortByTime);
  return { pickups, dropoffs };
}

function warsawMinutesNow(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function findNextMergedEntry(
  timeline: { pickups: TimelineEntry[]; dropoffs: TimelineEntry[] },
  now: Date = new Date(),
): {
  id: string;
  time: string;
  label: string;
  kind: TimelineDirection;
} | null {
  const { weekday } = getWarsawParts(now);
  if (weekday < 1 || weekday > 5) return null;

  const nowMinutes = warsawMinutesNow(now);
  let best: {
    id: string;
    time: string;
    label: string;
    kind: TimelineDirection;
  } | null = null;
  let bestMinutes = Number.POSITIVE_INFINITY;

  function consider(entry: TimelineEntry, index: number) {
    const minutes = timeToMinutes(entry.time);
    if (minutes === null || minutes < nowMinutes) return;
    if (minutes >= bestMinutes) return;
    bestMinutes = minutes;
    if (entry.kind === "school") {
      best = {
        id: entry.stopId,
        time: entry.time,
        label: `${entry.places.join(", ")} · szkolny`,
        kind: entry.direction,
      };
    } else {
      best = {
        id: `mzk-${entry.departure.departTime}-${entry.departure.route}-${index}`,
        time: entry.time,
        label: `MZK ${entry.departure.route} · ${entry.departure.boardStopName} → ${entry.departure.alightStopName}`,
        kind: entry.direction,
      };
    }
  }

  timeline.pickups.forEach((entry, index) => consider(entry, index));
  timeline.dropoffs.forEach((entry, index) => consider(entry, index));
  return best;
}
