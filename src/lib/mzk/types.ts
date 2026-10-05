export type MzkStop = {
  id: string;
  name: string;
};

export type MzkTripStop = {
  stopId: string;
  time: string;
  sequence: number;
};

/** School-weekday trip (Mon–Fri / dni nauki wg kalendarza MZK). */
export type MzkTrip = {
  route: string;
  headsign: string;
  serviceId: string;
  stops: MzkTripStop[];
};

/** Filtered origin→destination result for the UI. */
export type MzkOdDeparture = {
  departTime: string;
  arriveTime: string;
  route: string;
  headsign: string;
  boardStopName: string;
  alightStopName: string;
};

export type MzkSchedule = {
  sourceUrl: string;
  attribution: string;
  fetchedAt: string;
  feedStartDate: string;
  feedEndDate: string;
  stops: MzkStop[];
  trips: MzkTrip[];
  /** GTFS service_id → YYYYMMDD dates when that timetable runs (school weekdays). */
  serviceDates: Record<string, string[]>;
};

export const MZK_DEVELOPER_PAGE_URL =
  "https://www.mzk.zgora.pl/dla-deweloperow" as const;

export const MZK_ATTRIBUTION = "MZK Zielona Góra" as const;

export const MZK_SNAPSHOT_PATH = "data/mzk-schedule.json" as const;

/** Lightweight sidecar for footer / home — avoids parsing the full GTFS snapshot. */
export const MZK_META_PATH = "data/mzk-schedule-meta.json" as const;

/**
 * Paths on the same host as DOWOZY_API_BASE_URL (local schedule API).
 * Empty / unset base URL = load from repo JSON snapshots (production default).
 */
export const MZK_API_SCHEDULE_PATH = "/api/v1/mzk/schedule" as const;
export const MZK_API_META_PATH = "/api/v1/mzk/meta" as const;

export type MzkScheduleMetaFile = {
  sourceUrl: string;
  attribution: string;
  fetchedAt: string;
  feedStartDate: string;
  feedEndDate: string;
  stopCount: number;
  tripCount: number;
};
