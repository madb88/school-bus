import { timeToMinutes } from "@/lib/child-schedule/match";
import { getWarsawParts } from "./schedule-dates";
import type { Schedule } from "./types";

export type NextTripKind = "pickup" | "dropoff";

export type NextTrip = {
  id: string;
  kind: NextTripKind;
  time: string;
  places: string[];
  /** Driver / vehicle / day label for context */
  context: string;
};

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

/** Stable DOM id — avoids spaces/diacritics breaking fragment links. */
export function stopDomId(
  kind: "pickup" | "dropoff-date" | "dropoff-weekday",
  parts: string[],
): string {
  const slug = parts
    .join("-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `stop-${kind}-${slug}`;
}

/**
 * Among stops already filtered for "today", pick the soonest stop at or after now.
 */
export function findNextTrip(
  schedule: Schedule,
  now: Date = new Date(),
): NextTrip | null {
  const { weekday } = getWarsawParts(now);
  if (weekday < 1 || weekday > 5) return null;

  const nowMinutes = warsawMinutesNow(now);
  let best: NextTrip | null = null;
  let bestMinutes = Number.POSITIVE_INFINITY;

  function consider(candidate: NextTrip) {
    const minutes = timeToMinutes(candidate.time);
    if (minutes === null || minutes < nowMinutes) return;
    if (minutes >= bestMinutes) return;
    best = candidate;
    bestMinutes = minutes;
  }

  for (const block of schedule.pickups) {
    for (const course of block.courses) {
      for (const [index, stop] of course.stops.entries()) {
        consider({
          id: stopDomId("pickup", [
            block.name,
            course.label,
            String(index),
            stop.time,
          ]),
          kind: "pickup",
          time: stop.time,
          places: stop.places,
          context: block.name,
        });
      }
    }
  }

  for (const day of schedule.dropoffsByDate) {
    for (const [index, run] of day.runs.entries()) {
      consider({
        id: stopDomId("dropoff-date", [
          day.dateLabel,
          String(index),
          run.time,
        ]),
        kind: "dropoff",
        time: run.time,
        places: run.places,
        context: day.dateLabel,
      });
    }
  }

  for (const block of schedule.dropoffsWeekday) {
    for (const [index, run] of block.runs.entries()) {
      consider({
        id: stopDomId("dropoff-weekday", [
          block.driver,
          String(index),
          run.time,
        ]),
        kind: "dropoff",
        time: run.time,
        places: run.places,
        context: block.title,
      });
    }
  }

  return best;
}
