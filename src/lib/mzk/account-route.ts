import type { BackendMzkRoute } from "@/lib/auth/backend";
import {
  EMPTY_MZK_ROUTE,
  type MzkRoutePreference,
} from "./route-preference";

export function accountMzkRouteToPreference(
  route: BackendMzkRoute | null | undefined,
): MzkRoutePreference {
  if (!route) return { ...EMPTY_MZK_ROUTE };
  return {
    boardStopId: route.boardStopId,
    alightStopId: route.alightStopId,
    route: route.route ?? null,
  };
}
