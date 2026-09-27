export type Stop = {
  time: string;
  places: string[];
};

export type Course = {
  label: string;
  note?: string;
  stops: Stop[];
};

export type DriverBlock = {
  name: string;
  kind: "driver" | "vehicle";
  courses: Course[];
};

export type DayDropoff = {
  dateLabel: string;
  driver: string;
  runs: Stop[];
};

export type WeekdayDropoff = {
  title: string;
  driver: string;
  runs: Stop[];
};

export type Schedule = {
  sourceUrl: string;
  fetchedAt: string;
  title: string;
  periodLabel: string;
  pickups: DriverBlock[];
  dropoffsByDate: DayDropoff[];
  dropoffsWeekday: WeekdayDropoff[];
};

export const DOWOZY_SOURCE_URL =
  "https://www.szkolaolimpijczykow.pl/dowozy/" as const;

export const DOWOZY_SNAPSHOT_PATH = "data/dowozy-schedule.json" as const;

export const DOWOZY_OVERRIDES_PATH = "data/dowozy-overrides.json" as const;

/** Temporary full-schedule correction layered on top of the scrape snapshot. */
export type DowozyOverride = {
  active: boolean;
  reason: string;
  createdAt: string;
  expiresAt?: string;
  /** Full Schedule when active; null when inactive placeholder. */
  schedule: Schedule | null;
};

export type OverrideStatus =
  | "none"
  | "override_active_conflict"
  | "override_matches_source"
  | "override_expired";

export type ScheduleSnapshotResult = {
  /** Effective schedule for UI / push / fingerprint. */
  schedule: Schedule;
  source: "scrape" | "override";
  overrideStatus: OverrideStatus;
  overrideReason?: string;
};
