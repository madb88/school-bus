import type {
  ScheduleDateFilter,
  ScheduleDirection,
} from "./filter-schedule";

export type ScheduleFilterParams = {
  /** undefined = not in URL (may fall back to preferred place) */
  place: string | null | undefined;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  matchLessonPlan: boolean;
};

export type ParsedFilterParams = {
  place: string | null | undefined;
  dateFilter: ScheduleDateFilter | undefined;
  direction: ScheduleDirection | undefined;
  matchLessonPlan: boolean;
  /** True when at least one filter query key is present */
  hasExplicit: boolean;
};

const DAY_TO_PARAM: Record<Exclude<ScheduleDateFilter, "all">, string> = {
  today: "dzisiaj",
  tomorrow: "jutro",
};

const PARAM_TO_DAY: Record<string, ScheduleDateFilter> = {
  dzisiaj: "today",
  dzis: "today",
  today: "today",
  jutro: "tomorrow",
  tomorrow: "tomorrow",
};

const DIR_TO_PARAM: Record<Exclude<ScheduleDirection, "all">, string> = {
  pickups: "dowozy",
  dropoffs: "odwozy",
};

const PARAM_TO_DIR: Record<string, ScheduleDirection> = {
  dowozy: "pickups",
  pickups: "pickups",
  odwozy: "dropoffs",
  dropoffs: "dropoffs",
};

function readParam(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  if (source instanceof URLSearchParams) {
    return source.has(key) ? (source.get(key) ?? "") : null;
  }
  if (!(key in source)) return null;
  const raw = source[key];
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

function hasKey(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
  key: string,
): boolean {
  if (source instanceof URLSearchParams) return source.has(key);
  return Object.prototype.hasOwnProperty.call(source, key);
}

export function parseFilterParams(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
): ParsedFilterParams {
  const hasExplicit =
    hasKey(source, "dopasuj") ||
    hasKey(source, "dzien") ||
    hasKey(source, "day") ||
    hasKey(source, "miejsce") ||
    hasKey(source, "place") ||
    hasKey(source, "kierunek") ||
    hasKey(source, "dir");

  const dopasuj = readParam(source, "dopasuj");
  const matchLessonPlan = dopasuj === "1" || dopasuj === "true";

  let dateFilter: ScheduleDateFilter | undefined;
  const dzien = readParam(source, "dzien") ?? readParam(source, "day");
  if (dzien !== null) {
    const normalized = dzien.trim().toLowerCase();
    if (!normalized || normalized === "wszystkie" || normalized === "all") {
      dateFilter = "all";
    } else {
      dateFilter = PARAM_TO_DAY[normalized] ?? "all";
    }
  } else if (matchLessonPlan) {
    dateFilter = "today";
  }

  let place: string | null | undefined;
  if (hasKey(source, "miejsce") || hasKey(source, "place")) {
    const raw =
      (readParam(source, "miejsce") ?? readParam(source, "place") ?? "").trim();
    place = raw === "" ? null : raw;
  }

  let direction: ScheduleDirection | undefined;
  const kierunek = readParam(source, "kierunek") ?? readParam(source, "dir");
  if (kierunek !== null) {
    const normalized = kierunek.trim().toLowerCase();
    if (!normalized || normalized === "wszystkie" || normalized === "all") {
      direction = "all";
    } else {
      direction = PARAM_TO_DIR[normalized] ?? "all";
    }
  }

  return { place, dateFilter, direction, matchLessonPlan, hasExplicit };
}

/** Build query string without leading `?`. Omits default "all" values. */
export function serializeFilterParams(filters: {
  place: string | null;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  matchLessonPlan: boolean;
}): string {
  const params = new URLSearchParams();

  if (filters.matchLessonPlan) {
    params.set("dopasuj", "1");
  }

  if (filters.dateFilter !== "all") {
    params.set("dzien", DAY_TO_PARAM[filters.dateFilter]);
  }

  if (filters.place) {
    params.set("miejsce", filters.place);
  }

  if (filters.direction !== "all") {
    params.set("kierunek", DIR_TO_PARAM[filters.direction]);
  }

  return params.toString();
}

export function filtersHref(filters: {
  place: string | null;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  matchLessonPlan: boolean;
}): string {
  const qs = serializeFilterParams(filters);
  return qs ? `/?${qs}` : "/";
}
