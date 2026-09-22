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
