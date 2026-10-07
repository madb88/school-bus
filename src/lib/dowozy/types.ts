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

/**
 * Server-only base URL for the school schedule API (local testing).
 * Empty / unset = load from repo JSON snapshots (production default).
 */
export const DOWOZY_API_SCHEDULE_PATH = "/api/v1/dowozy/schedule" as const;
export const DOWOZY_API_HEALTH_PATH = "/health" as const;

/** Manual correction block from GET /api/v1/dowozy/schedule. */
export type DowozyApiModified = {
  active: boolean;
  /** Inclusive calendar day YYYY-MM-DD (Europe/Warsaw). */
  activeUntil?: string;
  schedule?: Schedule | null;
};

/** Response shape from GET /api/v1/dowozy/schedule. */
export type DowozyApiScheduleResponse = {
  original: Schedule;
  /** Absent when the backend has no active correction. */
  modified?: DowozyApiModified;
};

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
