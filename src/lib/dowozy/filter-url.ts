import type {
  ScheduleDateFilter,
  ScheduleDirection,
} from "./filter-schedule";
import { parseAbsoluteYmd } from "./schedule-dates";

export type ScheduleSourceMode = "school" | "school-mzk";

export type ScheduleFilterParams = {
  /** undefined = not in URL (may fall back to preferred place) */
  place: string | null | undefined;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  matchLessonPlan: boolean;
  sourceMode: ScheduleSourceMode;
};

export type ParsedFilterParams = {
  place: string | null | undefined;
  dateFilter: ScheduleDateFilter | undefined;
  direction: ScheduleDirection | undefined;
  /** undefined = not in URL (default: on when lesson plan exists) */
  matchLessonPlan: boolean | undefined;
  sourceMode: ScheduleSourceMode | undefined;
  /** True when at least one filter query key is present */
  hasExplicit: boolean;
};

const DAY_TO_PARAM: Record<"today" | "tomorrow", string> = {
  today: "dzisiaj",
  tomorrow: "jutro",
};

const PARAM_TO_DAY: Record<string, "today" | "tomorrow"> = {
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

const SOURCE_TO_PARAM: Record<Exclude<ScheduleSourceMode, "school">, string> = {
  "school-mzk": "szkolny-mzk",
};

const PARAM_TO_SOURCE: Record<string, ScheduleSourceMode> = {
  szkolny: "school",
  school: "school",
  "szkolny-mzk": "school-mzk",
  "school-mzk": "school-mzk",
  mzk: "school-mzk",
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
    hasKey(source, "dir") ||
    hasKey(source, "zrodlo") ||
    hasKey(source, "source");

  const dopasuj = readParam(source, "dopasuj");
  let matchLessonPlan: boolean | undefined;
  if (dopasuj === null) {
    matchLessonPlan = undefined;
  } else {
    const normalized = dopasuj.trim().toLowerCase();
    if (
      normalized === "0" ||
      normalized === "false" ||
      normalized === "nie"
    ) {
      matchLessonPlan = false;
    } else if (
      normalized === "1" ||
      normalized === "true" ||
      normalized === "tak"
    ) {
      matchLessonPlan = true;
    } else {
      matchLessonPlan = undefined;
    }
  }

  let dateFilter: ScheduleDateFilter | undefined;
  const dzien = readParam(source, "dzien") ?? readParam(source, "day");
  if (dzien !== null) {
    const trimmed = dzien.trim();
    const normalized = trimmed.toLowerCase();
    if (!normalized || normalized === "wszystkie" || normalized === "all") {
      dateFilter = "all";
    } else {
      const absolute = parseAbsoluteYmd(trimmed);
      dateFilter = absolute ?? PARAM_TO_DAY[normalized] ?? "today";
    }
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

  let sourceMode: ScheduleSourceMode | undefined;
  const zrodlo = readParam(source, "zrodlo") ?? readParam(source, "source");
  if (zrodlo !== null) {
    const normalized = zrodlo.trim().toLowerCase();
    sourceMode = PARAM_TO_SOURCE[normalized] ?? "school";
  }

  return {
    place,
    dateFilter,
    direction,
    matchLessonPlan,
    sourceMode,
    hasExplicit,
  };
}

/** Build query string without leading `?`. Omits defaults (today / direction all). */
export function serializeFilterParams(filters: {
  place: string | null;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  matchLessonPlan: boolean;
  sourceMode?: ScheduleSourceMode;
  /** Persist dopasuj=0 when match is off (needed when plan exists and default is on). */
  persistMatchOff?: boolean;
  /** Persist zrodlo=szkolny when school-only is chosen but MZK route exists (default would be school-mzk). */
  persistSourceSchool?: boolean;
}): string {
  const params = new URLSearchParams();

  if (filters.matchLessonPlan) {
    params.set("dopasuj", "1");
  } else if (filters.persistMatchOff) {
    params.set("dopasuj", "0");
  }

  if (filters.dateFilter === "all") {
    params.set("dzien", "wszystkie");
  } else if (filters.dateFilter === "today") {
    // default — omit
  } else if (filters.dateFilter === "tomorrow") {
    params.set("dzien", DAY_TO_PARAM.tomorrow);
  } else {
    params.set("dzien", filters.dateFilter);
  }

  if (filters.place) {
    params.set("miejsce", filters.place);
  }

  if (filters.direction !== "all") {
    params.set("kierunek", DIR_TO_PARAM[filters.direction]);
  }

  if (filters.sourceMode === "school-mzk") {
    params.set("zrodlo", SOURCE_TO_PARAM["school-mzk"]);
  } else if (filters.persistSourceSchool) {
    params.set("zrodlo", "szkolny");
  }

  return params.toString();
}

export function filtersHref(filters: {
  place: string | null;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  matchLessonPlan?: boolean;
  sourceMode?: ScheduleSourceMode;
}): string {
  const qs = serializeFilterParams({
    place: filters.place,
    dateFilter: filters.dateFilter,
    direction: filters.direction,
    matchLessonPlan: filters.matchLessonPlan ?? false,
    sourceMode: filters.sourceMode,
    persistMatchOff: filters.matchLessonPlan === false,
    persistSourceSchool: filters.sourceMode === "school",
  });
  return qs ? `/?${qs}` : "/";
}
