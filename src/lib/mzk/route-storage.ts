import {
  EMPTY_MZK_ROUTE,
  MZK_ROUTE_STORAGE_KEY,
  type MzkRoutePreference,
} from "./route-preference";

function isStopId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseMzkRoutePreference(raw: unknown): MzkRoutePreference {
  if (!raw || typeof raw !== "object") return { ...EMPTY_MZK_ROUTE };

  const record = raw as Record<string, unknown>;
  const route =
    typeof record.route === "string" && record.route.trim()
      ? record.route.trim()
      : null;

  return {
    boardStopId: isStopId(record.boardStopId) ? record.boardStopId.trim() : null,
    alightStopId: isStopId(record.alightStopId)
      ? record.alightStopId.trim()
      : null,
    route,
  };
}

export function loadMzkRoutePreference(): MzkRoutePreference {
  if (typeof window === "undefined") return { ...EMPTY_MZK_ROUTE };

  try {
    const raw = window.localStorage.getItem(MZK_ROUTE_STORAGE_KEY);
    if (!raw) return { ...EMPTY_MZK_ROUTE };
    return parseMzkRoutePreference(JSON.parse(raw));
  } catch {
    return { ...EMPTY_MZK_ROUTE };
  }
}

export function saveMzkRoutePreference(pref: MzkRoutePreference): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MZK_ROUTE_STORAGE_KEY, JSON.stringify(pref));
  window.dispatchEvent(new Event("school-bus-mzk-route"));
}

export function clearMzkRoutePreference(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MZK_ROUTE_STORAGE_KEY);
  window.dispatchEvent(new Event("school-bus-mzk-route"));
}

export function hasConfiguredMzkRoute(pref: MzkRoutePreference): boolean {
  return Boolean(pref.boardStopId && pref.alightStopId);
}
