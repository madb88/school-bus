import type { ScheduleDateFilter } from "@/lib/dowozy/filter-schedule";
import type { MzkOdDeparture } from "@/lib/mzk/types";
import { OFFLINE_STORE_MZK_OD } from "./constants";
import { idbClearStore, idbGet, idbSet } from "./idb";

export type MzkOdOfflineBundle = {
  pickups: MzkOdDeparture[];
  dropoffs: MzkOdDeparture[];
  cachedAt: string;
  boardStopId: string;
  alightStopId: string;
  dateFilter: string;
  route: string | null;
};

function isOdDeparture(value: unknown): value is MzkOdDeparture {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.departTime === "string" &&
    typeof record.arriveTime === "string" &&
    typeof record.route === "string" &&
    typeof record.headsign === "string" &&
    typeof record.boardStopName === "string" &&
    typeof record.alightStopName === "string"
  );
}

export function mzkOdCacheKey(
  boardStopId: string,
  alightStopId: string,
  dateFilter: ScheduleDateFilter | string,
  route: string | null,
): string {
  return `${boardStopId}\0${alightStopId}\0${String(dateFilter)}\0${route ?? ""}`;
}

export function parseMzkOdOfflineBundle(raw: unknown): MzkOdOfflineBundle | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.pickups) || !Array.isArray(record.dropoffs)) {
    return null;
  }
  if (typeof record.cachedAt !== "string" || !record.cachedAt) return null;
  if (typeof record.boardStopId !== "string" || !record.boardStopId) return null;
  if (typeof record.alightStopId !== "string" || !record.alightStopId) {
    return null;
  }
  if (typeof record.dateFilter !== "string") return null;
  const route =
    record.route === null || record.route === undefined
      ? null
      : typeof record.route === "string"
        ? record.route
        : null;
  if (!record.pickups.every(isOdDeparture)) return null;
  if (!record.dropoffs.every(isOdDeparture)) return null;
  return {
    pickups: record.pickups,
    dropoffs: record.dropoffs,
    cachedAt: record.cachedAt,
    boardStopId: record.boardStopId,
    alightStopId: record.alightStopId,
    dateFilter: record.dateFilter,
    route,
  };
}

export async function saveMzkOdOfflineBundle(input: {
  boardStopId: string;
  alightStopId: string;
  dateFilter: ScheduleDateFilter | string;
  route: string | null;
  pickups: MzkOdDeparture[];
  dropoffs: MzkOdDeparture[];
}): Promise<void> {
  const key = mzkOdCacheKey(
    input.boardStopId,
    input.alightStopId,
    input.dateFilter,
    input.route,
  );
  const bundle: MzkOdOfflineBundle = {
    pickups: input.pickups,
    dropoffs: input.dropoffs,
    cachedAt: new Date().toISOString(),
    boardStopId: input.boardStopId,
    alightStopId: input.alightStopId,
    dateFilter: String(input.dateFilter),
    route: input.route,
  };
  await idbSet(OFFLINE_STORE_MZK_OD, key, bundle);
}

export async function loadMzkOdOfflineBundle(
  boardStopId: string,
  alightStopId: string,
  dateFilter: ScheduleDateFilter | string,
  route: string | null,
): Promise<MzkOdOfflineBundle | null> {
  try {
    const key = mzkOdCacheKey(boardStopId, alightStopId, dateFilter, route);
    const raw = await idbGet<unknown>(OFFLINE_STORE_MZK_OD, key);
    return parseMzkOdOfflineBundle(raw);
  } catch {
    return null;
  }
}

export async function clearMzkOdOfflineCache(): Promise<void> {
  try {
    await idbClearStore(OFFLINE_STORE_MZK_OD);
  } catch {
    // ignore
  }
}
