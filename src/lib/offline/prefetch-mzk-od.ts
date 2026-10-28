import type { ScheduleDateFilter } from "@/lib/dowozy/filter-schedule";
import type { MzkOdBundle } from "@/lib/mzk/use-mzk-od-departures";
import { hasOfflineEntitlement } from "./entitlement";
import { saveMzkOdOfflineBundle } from "./mzk-od-cache";

const PREFETCH_DATES: ScheduleDateFilter[] = ["today", "tomorrow"];

async function fetchOdBundle(
  boardStopId: string,
  alightStopId: string,
  dateFilter: ScheduleDateFilter,
  route: string | null,
): Promise<MzkOdBundle | null> {
  const params = new URLSearchParams({
    board: boardStopId,
    alight: alightStopId,
    date: dateFilter,
  });
  if (route) params.set("route", route);
  const response = await fetch(`/api/mzk-departures?${params.toString()}`);
  if (!response.ok) return null;
  const json = (await response.json()) as MzkOdBundle;
  return {
    pickups: Array.isArray(json.pickups) ? json.pickups : [],
    dropoffs: Array.isArray(json.dropoffs) ? json.dropoffs : [],
  };
}

/** Warm OD cache for the saved MZK route (Plus + online). */
export async function prefetchMzkOdForRoute(opts: {
  boardStopId: string;
  alightStopId: string;
  route?: string | null;
}): Promise<void> {
  if (!hasOfflineEntitlement()) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const route = opts.route?.trim() ? opts.route.trim() : null;

  await Promise.all(
    PREFETCH_DATES.map(async (dateFilter) => {
      try {
        const bundle = await fetchOdBundle(
          opts.boardStopId,
          opts.alightStopId,
          dateFilter,
          route,
        );
        if (!bundle) return;
        await saveMzkOdOfflineBundle({
          boardStopId: opts.boardStopId,
          alightStopId: opts.alightStopId,
          dateFilter,
          route,
          pickups: bundle.pickups,
          dropoffs: bundle.dropoffs,
        });
      } catch {
        // Prefetch is best-effort.
      }
    }),
  );
}
