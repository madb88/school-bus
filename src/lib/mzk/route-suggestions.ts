import {
  canonicalUniqueStopId,
  routesForOd,
  uniqueStopsByName,
} from "./filter-departures";
import type { MzkSchedule, MzkStop } from "./types";

export type MzkRouteSuggestion = {
  boardStopId: string;
  alightStopId: string;
  boardName: string;
  alightName: string;
  label: string;
};

/** Per-place board stops + optional nearest-stop note (from school detail). */
export type SuggestPlaceStops = {
  stopIds: readonly string[];
  note?: string;
};

export type SuggestMzkRoutesOptions = {
  /** Alight candidates near the school; order is suggestion preference. */
  schoolStopIds: readonly string[];
  /** Board stops keyed by dowozy place name. */
  placeStops: Readonly<Record<string, SuggestPlaceStops>>;
};

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
  placeStops: Readonly<Record<string, SuggestPlaceStops>>,
): MzkStop[] {
  if (!schoolPlace) return [];

  const mapped = uniqueStopsFromIds(
    schedule,
    placeStops[schoolPlace]?.stopIds ?? [],
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
 * Suggested board→school pairs based on lesson-plan / preferred place and
 * school-configured stop lists. Only returns pairs with a direct weekday MZK trip.
 */
export function suggestMzkRoutes(
  schedule: MzkSchedule,
  schoolPlace: string | null,
  options: SuggestMzkRoutesOptions,
): MzkRouteSuggestion[] {
  const boards = boardStopsForPlace(schedule, schoolPlace, options.placeStops);
  if (boards.length === 0) return [];

  const alights = uniqueStopsFromIds(schedule, options.schoolStopIds);
  if (alights.length === 0) return [];

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

/** Build the placeStops map for suggestions from school detail entries. */
export function placeStopsMapFromEntries(
  entries: readonly { place: string; stopIds: string[]; note?: string }[],
): Record<string, SuggestPlaceStops> {
  const out: Record<string, SuggestPlaceStops> = {};
  for (const entry of entries) {
    out[entry.place] = {
      stopIds: entry.stopIds,
      ...(entry.note ? { note: entry.note } : {}),
    };
  }
  return out;
}

export function nearestPlaceNote(
  schoolPlace: string | null,
  placeStops: Readonly<Record<string, SuggestPlaceStops>>,
): string | null {
  if (!schoolPlace) return null;
  return placeStops[schoolPlace]?.note ?? null;
}
