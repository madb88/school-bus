import {
  addCalendarDays,
  getWarsawParts,
  isSchoolDay,
  type ScheduleDateFilter,
} from "@/lib/dowozy/schedule-dates";
import type { MzkOdDeparture, MzkSchedule, MzkStop } from "./types";

function ymdFromParts(parts: {
  year: number;
  month: number;
  day: number;
}): string {
  const m = String(parts.month + 1).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${parts.year}${m}${d}`;
}

function servicesOnDate(
  schedule: MzkSchedule,
  ymd: string,
): Set<string> {
  const active = new Set<string>();
  for (const [serviceId, dates] of Object.entries(schedule.serviceDates)) {
    if (dates.includes(ymd)) active.add(serviceId);
  }
  return active;
}

/**
 * School weekdays only (Mon–Fri) using MZK calendar.
 * Returns empty set when the target day is not a school/working weekday
 * in the feed (weekend, holiday, or no matching service).
 */
export function resolveSchoolServiceIds(
  schedule: MzkSchedule,
  dateFilter: ScheduleDateFilter,
  now: Date = new Date(),
): Set<string> {
  const today = getWarsawParts(now);

  if (dateFilter === "today" || dateFilter === "tomorrow") {
    const target =
      dateFilter === "today" ? today : addCalendarDays(today, 1);
    if (!isSchoolDay(target.weekday)) return new Set();
    return servicesOnDate(schedule, ymdFromParts(target));
  }

  // "Wszystkie dni" → one coherent school-day timetable (nearest Mon–Fri with services).
  let cursor = today;
  for (let i = 0; i < 21; i++) {
    if (isSchoolDay(cursor.weekday)) {
      const ids = servicesOnDate(schedule, ymdFromParts(cursor));
      if (ids.size > 0) return ids;
    }
    cursor = addCalendarDays(cursor, 1);
  }

  // Fallback: service with the most dates.
  let bestId: string | null = null;
  let bestCount = 0;
  for (const [serviceId, dates] of Object.entries(schedule.serviceDates)) {
    if (dates.length > bestCount) {
      bestCount = dates.length;
      bestId = serviceId;
    }
  }
  return bestId ? new Set([bestId]) : new Set();
}

/** Opposite road sides share a name but differ by stop_id. */
export function stopIdsWithSameName(
  schedule: MzkSchedule,
  stopId: string,
): string[] {
  const name = schedule.stops.find((s) => s.id === stopId)?.name;
  if (!name) return [stopId];
  return schedule.stops.filter((s) => s.name === name).map((s) => s.id);
}

export function uniqueStopsByName(stops: MzkStop[]): MzkStop[] {
  const seen = new Set<string>();
  const unique: MzkStop[] = [];
  for (const stop of stops) {
    const key = stop.name.toLocaleLowerCase("pl");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(stop);
  }
  return unique;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** e.g. "12 min" or "1 h 5 min" */
export function formatTravelDuration(
  departTime: string,
  arriveTime: string,
): string | null {
  const mins = timeToMinutes(arriveTime) - timeToMinutes(departTime);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function findOdDepartures(
  schedule: MzkSchedule | null,
  boardStopId: string | null,
  alightStopId: string | null,
  dateFilter: ScheduleDateFilter,
  now: Date = new Date(),
  route: string | null = null,
): MzkOdDeparture[] {
  if (!schedule || !boardStopId || !alightStopId) return [];
  if (boardStopId === alightStopId) return [];

  const serviceIds = resolveSchoolServiceIds(schedule, dateFilter, now);
  if (serviceIds.size === 0) return [];

  const boardIds = new Set(stopIdsWithSameName(schedule, boardStopId));
  const alightIds = new Set(stopIdsWithSameName(schedule, alightStopId));
  if ([...boardIds].some((id) => alightIds.has(id))) return [];

  const stopName = new Map(schedule.stops.map((s) => [s.id, s.name]));
  const results: MzkOdDeparture[] = [];
  const seen = new Set<string>();

  for (const trip of schedule.trips) {
    if (!serviceIds.has(trip.serviceId)) continue;
    if (route && trip.route !== route) continue;

    const board = trip.stops.find((s) => boardIds.has(s.stopId));
    const alight = trip.stops.find((s) => alightIds.has(s.stopId));
    if (!board || !alight) continue;
    if (board.sequence >= alight.sequence) continue;

    const boardName = stopName.get(board.stopId) ?? board.stopId;
    const alightName = stopName.get(alight.stopId) ?? alight.stopId;
    const key = `${board.time}|${alight.time}|${trip.route}|${trip.headsign}|${boardName}|${alightName}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      departTime: board.time,
      arriveTime: alight.time,
      route: trip.route,
      headsign: trip.headsign,
      boardStopName: boardName,
      alightStopName: alightName,
    });
  }

  results.sort(
    (a, b) => timeToMinutes(a.departTime) - timeToMinutes(b.departTime),
  );
  return results;
}

/** Line numbers that have a direct trip between the two stops (school weekdays). */
export function routesForOd(
  schedule: MzkSchedule | null,
  boardStopId: string | null,
  alightStopId: string | null,
  now: Date = new Date(),
): string[] {
  if (!schedule || !boardStopId || !alightStopId) return [];
  if (boardStopId === alightStopId) return [];

  const serviceIds = resolveSchoolServiceIds(schedule, "all", now);
  if (serviceIds.size === 0) return [];

  const boardIds = new Set(stopIdsWithSameName(schedule, boardStopId));
  const alightIds = new Set(stopIdsWithSameName(schedule, alightStopId));
  if ([...boardIds].some((id) => alightIds.has(id))) return [];

  const routes = new Set<string>();
  for (const trip of schedule.trips) {
    if (!serviceIds.has(trip.serviceId)) continue;
    const board = trip.stops.find((s) => boardIds.has(s.stopId));
    const alight = trip.stops.find((s) => alightIds.has(s.stopId));
    if (!board || !alight) continue;
    if (board.sequence >= alight.sequence) continue;
    routes.add(trip.route);
  }

  return [...routes].sort((a, b) =>
    a.localeCompare(b, "pl", { numeric: true }),
  );
}

export function stopById(
  schedule: MzkSchedule | null,
  stopId: string | null,
): MzkStop | null {
  if (!schedule || !stopId) return null;
  return schedule.stops.find((s) => s.id === stopId) ?? null;
}
