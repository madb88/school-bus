import type {
  ScheduleDateFilter,
  ScheduleDirection,
} from "./filter-schedule";
import { parseAbsoluteYmd } from "./schedule-dates";

export type ScheduleSourceMode = "school" | "school-mzk";

/** Lesson-plan match filter: off, all account plans, or one plan by index. */
export type PlanMatchFilter = "off" | "all" | number;

export type ScheduleFilterParams = {
  /** undefined = not in URL (may fall back to preferred place); null = all; else selected. */
  places: string[] | null | undefined;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  planMatch: PlanMatchFilter;
  sourceMode: ScheduleSourceMode;
};

export type ParsedFilterParams = {
  places: string[] | null | undefined;
  dateFilter: ScheduleDateFilter | undefined;
  direction: ScheduleDirection | undefined;
  /**
   * undefined = not in URL (default: all when a plan exists).
   * Prefer `planMatch`; `matchLessonPlan` is derived for older callers.
   */
  planMatch: PlanMatchFilter | undefined;
  /** @deprecated Use planMatch. true ↔ all, false ↔ off. */
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

/** Split `miejsce` query: comma-separated, trimmed, non-empty. */
export function parsePlacesParam(raw: string): string[] {
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function serializePlacesParam(places: string[]): string {
  return places.join(",");
}

export function parseFilterParams(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
): ParsedFilterParams {
  const hasExplicit =
    hasKey(source, "dopasuj") ||
    hasKey(source, "plan") ||
    hasKey(source, "dzien") ||
    hasKey(source, "day") ||
    hasKey(source, "miejsce") ||
    hasKey(source, "place") ||
    hasKey(source, "kierunek") ||
    hasKey(source, "dir") ||
    hasKey(source, "zrodlo") ||
    hasKey(source, "source");

  const dopasuj = readParam(source, "dopasuj");
  const planRaw = readParam(source, "plan");
  let planMatch: PlanMatchFilter | undefined;
  if (planRaw !== null) {
    const normalized = planRaw.trim().toLowerCase();
    if (!normalized || normalized === "all" || normalized === "wszystkie") {
      planMatch = "all";
    } else if (
      normalized === "off" ||
      normalized === "none" ||
      normalized === "bez"
    ) {
      planMatch = "off";
    } else {
      const index = Number.parseInt(normalized, 10);
      if (
        Number.isInteger(index) &&
        index >= 0 &&
        String(index) === normalized
      ) {
        planMatch = index;
      }
    }
  }
  if (planMatch === undefined && dopasuj !== null) {
    const normalized = dopasuj.trim().toLowerCase();
    if (
      normalized === "0" ||
      normalized === "false" ||
      normalized === "nie"
    ) {
      planMatch = "off";
    } else if (
      normalized === "1" ||
      normalized === "true" ||
      normalized === "tak"
    ) {
      planMatch = "all";
    }
  }
  const matchLessonPlan =
    planMatch === undefined ? undefined : planMatch !== "off";

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

  let places: string[] | null | undefined;
  if (hasKey(source, "miejsce") || hasKey(source, "place")) {
    const raw =
      (readParam(source, "miejsce") ?? readParam(source, "place") ?? "").trim();
    if (raw === "") {
      places = null;
    } else {
      const parsed = parsePlacesParam(raw);
      places = parsed.length > 0 ? parsed : null;
    }
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
    places,
    dateFilter,
    direction,
    planMatch,
    matchLessonPlan,
    sourceMode,
    hasExplicit,
  };
}

/** Build query string without leading `?`. Omits defaults (today / direction all). */
export function serializeFilterParams(filters: {
  places: string[] | null;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  planMatch?: PlanMatchFilter;
  /** @deprecated Prefer planMatch. */
  matchLessonPlan?: boolean;
  sourceMode?: ScheduleSourceMode;
  /** Persist dopasuj=0 when match is off (needed when plan exists and default is on). */
  persistMatchOff?: boolean;
  /** Persist zrodlo=szkolny when school-only is chosen but MZK route exists (default would be school-mzk). */
  persistSourceSchool?: boolean;
}): string {
  const params = new URLSearchParams();

  const planMatch: PlanMatchFilter =
    filters.planMatch ??
    (filters.matchLessonPlan === false
      ? "off"
      : filters.matchLessonPlan
        ? "all"
        : "off");

  if (planMatch === "off") {
    if (filters.persistMatchOff) {
      params.set("dopasuj", "0");
    }
  } else if (planMatch === "all") {
    params.set("dopasuj", "1");
  } else {
    params.set("dopasuj", "1");
    params.set("plan", String(planMatch));
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

  if (filters.places && filters.places.length > 0) {
    params.set("miejsce", serializePlacesParam(filters.places));
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
  places?: string[] | null;
  /** @deprecated Prefer `places`. */
  place?: string | null;
  dateFilter: ScheduleDateFilter;
  direction: ScheduleDirection;
  planMatch?: PlanMatchFilter;
  matchLessonPlan?: boolean;
  sourceMode?: ScheduleSourceMode;
}): string {
  const places =
    filters.places !== undefined
      ? filters.places
      : filters.place
        ? [filters.place]
        : null;
  const explicitPlanMatch: PlanMatchFilter | undefined =
    filters.planMatch !== undefined
      ? filters.planMatch
      : filters.matchLessonPlan === false
        ? "off"
        : filters.matchLessonPlan
          ? "all"
          : undefined;
  const qs = serializeFilterParams({
    places,
    dateFilter: filters.dateFilter,
    direction: filters.direction,
    planMatch: explicitPlanMatch ?? "off",
    sourceMode: filters.sourceMode,
    persistMatchOff: explicitPlanMatch === "off",
    persistSourceSchool: filters.sourceMode === "school",
  });
  return qs ? `/?${qs}` : "/";
}
