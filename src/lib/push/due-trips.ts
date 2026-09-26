import { formatTimeInput, getDayTimes, timeToMinutes } from "@/lib/child-schedule/match";
import { hasConfiguredLessons } from "@/lib/child-schedule/storage";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import { filtersHref } from "@/lib/dowozy/filter-url";
import { filterSchedule } from "@/lib/dowozy/filter-schedule";
import { getWarsawParts } from "@/lib/dowozy/schedule-dates";
import type { Schedule } from "@/lib/dowozy/types";

/** Notify when the matched trip is this many minutes away, or closer. */
export const PUSH_LEAD_MINUTES = 20;

export type DueTrip = {
  id: string;
  kind: "pickup" | "dropoff";
  time: string;
  place: string;
  title: string;
  body: string;
  url: string;
};

export function warsawDateKey(now: Date): string {
  const { year, month, day } = getWarsawParts(now);
  const monthText = String(month + 1).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  return `${year}-${monthText}-${dayText}`;
}

function warsawClockMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return (hour % 24) * 60 + minute;
}

/**
 * Trips for this lesson plan that depart within the lead window.
 * Dropoffs are included only when the plan has an end time for today.
 */
export function dueTripsForPlan(
  schedule: Schedule,
  plan: ChildLessonPlan,
  now: Date,
): DueTrip[] {
  if (!plan.place || !hasConfiguredLessons(plan)) return [];

  const { weekday } = getWarsawParts(now);
  if (weekday < 1 || weekday > 5) return [];

  const day = getDayTimes(plan, weekday);
  if (!day?.start) return [];

  const filtered = filterSchedule(schedule, {
    place: plan.place,
    direction: "all",
    dateFilter: "today",
    now,
    lessonPlan: plan,
    matchLessonPlan: true,
  });

  const nowMinutes = warsawClockMinutes(now);
  const dateKey = warsawDateKey(now);
  const seen = new Set<string>();
  const trips: DueTrip[] = [];

  function consider(kind: "pickup" | "dropoff", time: string) {
    if (kind === "dropoff" && !day?.end) return;
    const place = plan.place;
    if (!place) return;

    const minutes = timeToMinutes(time);
    if (minutes === null) return;
    const until = minutes - nowMinutes;
    if (until <= 0 || until > PUSH_LEAD_MINUTES) return;

    const clock = formatTimeInput(time);
    const id = `${dateKey}|${kind}|${clock}|${place}`;
    if (seen.has(id)) return;
    seen.add(id);

    trips.push({
      id,
      kind,
      time: clock,
      place,
      title:
        kind === "pickup"
          ? `Odjazd do szkoły za ${until} min`
          : `Autobus powrotny za ${until} min`,
      body: `${place} · ${clock}`,
      url: filtersHref({
        place,
        dateFilter: "today",
        direction: kind === "pickup" ? "pickups" : "dropoffs",
        matchLessonPlan: true,
      }),
    });
  }

  for (const block of filtered.pickups) {
    for (const course of block.courses) {
      for (const stop of course.stops) {
        consider("pickup", stop.time);
      }
    }
  }

  if (day.end) {
    // Only the first return at or after lesson end. Later courses that
    // afternoon are for other finish times and should not notify.
    const firstReturn = earliestDropoffTime(filtered);
    if (firstReturn) consider("dropoff", firstReturn);
  }

  return trips;
}

function earliestDropoffTime(schedule: Schedule): string | null {
  let bestTime: string | null = null;
  let bestMinutes = Number.POSITIVE_INFINITY;

  function consider(time: string) {
    const minutes = timeToMinutes(time);
    if (minutes === null || minutes >= bestMinutes) return;
    bestMinutes = minutes;
    bestTime = time;
  }

  for (const dropoff of schedule.dropoffsByDate) {
    for (const run of dropoff.runs) consider(run.time);
  }
  for (const block of schedule.dropoffsWeekday) {
    for (const run of block.runs) consider(run.time);
  }

  return bestTime;
}
