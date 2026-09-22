import {
  canonicalUniqueStopId,
  routesForOd,
  uniqueStopsByName,
} from "./filter-departures";
import {
  mzkStopIdsForPlace,
  SCHOOL_AREA_MZK_STOP_IDS,
} from "./place-map";
import type { MzkSchedule, MzkStop } from "./types";

export type MzkRouteSuggestion = {
  boardStopId: string;
  alightStopId: string;
  boardName: string;
  alightName: string;
  label: string;
};

const PREFERRED_SCHOOL_ALIGHT_IDS = [
  "307", // Drzonków - WOSiR
  "914", // Drzonków - WOSiR (other side)
  "299", // Drzonków Olimpijska
  "303", // DRZONKÓW
] as const;

function stopById(schedule: MzkSchedule, id: string): MzkStop | undefined {
  return schedule.stops.find((s) => s.id === id);
}

function uniqueStopsFromIds(
  schedule: MzkSchedule,
  ids: readonly string[],
): MzkStop[] {
  const seen = new Set<string>();
  const out: MzkStop[] = [];
  for (const id of ids) {
    const stop = stopById(schedule, id);
    if (!stop) continue;
    const key = stop.name.toLocaleLowerCase("pl");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(stop);
  }
  return out;
}

function boardStopsForPlace(
  schedule: MzkSchedule,
  schoolPlace: string | null,
): MzkStop[] {
  if (!schoolPlace) return [];

  const mapped = uniqueStopsFromIds(
    schedule,
    mzkStopIdsForPlace(schoolPlace),
  );
  if (mapped.length > 0) return mapped;

  const needle = schoolPlace
    .replace(/\s+[DM]\.?$/i, "")
    .trim()
    .toLocaleLowerCase("pl");
  if (!needle) return [];

  return uniqueStopsByName(schedule.stops).filter((stop) =>
    stop.name.toLocaleLowerCase("pl").includes(needle),
  );
}

/**
 * Suggested board→school pairs based on lesson-plan / preferred place.
 * Only returns pairs that have at least one direct weekday MZK trip.
 */
export function suggestMzkRoutes(
  schedule: MzkSchedule,
  schoolPlace: string | null,
): MzkRouteSuggestion[] {
  const boards = boardStopsForPlace(schedule, schoolPlace);
  if (boards.length === 0) return [];

  const alights = uniqueStopsFromIds(schedule, [
    ...PREFERRED_SCHOOL_ALIGHT_IDS,
    ...SCHOOL_AREA_MZK_STOP_IDS,
  ]);

  const suggestions: MzkRouteSuggestion[] = [];
  const seen = new Set<string>();

  for (const board of boards) {
    for (const alight of alights) {
      if (board.name.toLocaleLowerCase("pl") === alight.name.toLocaleLowerCase("pl")) {
        continue;
      }
      const routes = routesForOd(schedule, board.id, alight.id);
      if (routes.length === 0) continue;

      const key = `${board.name}|${alight.name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const boardStopId = canonicalUniqueStopId(schedule, board.id) ?? board.id;
      const alightStopId =
        canonicalUniqueStopId(schedule, alight.id) ?? alight.id;

      suggestions.push({
        boardStopId,
        alightStopId,
        boardName: board.name,
        alightName: alight.name,
        label: `${board.name} → ${alight.name}`,
      });
    }
  }

  return suggestions.slice(0, 4);
}
