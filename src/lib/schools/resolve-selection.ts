import { DEFAULT_CITY_ID, DEFAULT_SCHOOL_ID } from "./constants";
import { parseSchoolEntityId } from "./storage";
import type { SchoolSelection } from "./types";

export type SchoolFilterUrlParams = {
  cityId: string | undefined;
  schoolId: string | undefined;
  hasExplicit: boolean;
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

/** Parse `szkola` / `miasto` (or English aliases) from the query string. */
export function parseSchoolFilterParams(
  source: URLSearchParams | Record<string, string | string[] | undefined>,
): SchoolFilterUrlParams {
  const schoolRaw =
    readParam(source, "szkola") ?? readParam(source, "school");
  const cityRaw = readParam(source, "miasto") ?? readParam(source, "city");
  const hasExplicit =
    hasKey(source, "szkola") ||
    hasKey(source, "school") ||
    hasKey(source, "miasto") ||
    hasKey(source, "city");

  return {
    schoolId: parseSchoolEntityId(schoolRaw) ?? undefined,
    cityId: parseSchoolEntityId(cityRaw) ?? undefined,
    hasExplicit,
  };
}

/**
 * Resolve which school to load on the server.
 * Priority: URL schoolId → soft-default seed (localStorage is client-only).
 */
export function resolveServerSchoolSelection(
  source:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | undefined,
): SchoolSelection {
  if (!source) {
    return { cityId: DEFAULT_CITY_ID, schoolId: DEFAULT_SCHOOL_ID };
  }
  const parsed = parseSchoolFilterParams(source);
  return {
    cityId: parsed.cityId ?? DEFAULT_CITY_ID,
    schoolId: parsed.schoolId ?? DEFAULT_SCHOOL_ID,
  };
}

/**
 * Client-side priority: URL → localStorage → account defaults → seed.
 */
export function resolveClientSchoolSelection(input: {
  urlCityId?: string | null;
  urlSchoolId?: string | null;
  storedCityId?: string | null;
  storedSchoolId?: string | null;
  accountCityId?: string | null;
  accountSchoolId?: string | null;
}): SchoolSelection {
  const schoolId =
    parseSchoolEntityId(input.urlSchoolId) ??
    parseSchoolEntityId(input.storedSchoolId) ??
    parseSchoolEntityId(input.accountSchoolId) ??
    DEFAULT_SCHOOL_ID;
  const cityId =
    parseSchoolEntityId(input.urlCityId) ??
    parseSchoolEntityId(input.storedCityId) ??
    parseSchoolEntityId(input.accountCityId) ??
    DEFAULT_CITY_ID;
  return { cityId, schoolId };
}
