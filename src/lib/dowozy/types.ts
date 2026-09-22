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
