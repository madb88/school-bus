export type MzkRoutePreference = {
  boardStopId: string | null;
  alightStopId: string | null;
  /** Optional MZK line number, e.g. "30". null = any line on this OD. */
  route: string | null;
  /**
   * School the route was set for (device storage only). Stops belong to that
   * school's city, so the route is ignored for any other school. Absent in
   * saves from before multi-school: treated as the seed school.
   */
  schoolId?: string | null;
};

export const EMPTY_MZK_ROUTE: MzkRoutePreference = {
  boardStopId: null,
  alightStopId: null,
  route: null,
};

export const MZK_ROUTE_STORAGE_KEY = "school-bus.mzk-route.v1";
