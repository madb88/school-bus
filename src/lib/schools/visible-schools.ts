import type { City, School } from "./types";

function allowedSchoolIds(
  visibleSchoolIds: readonly string[] | null | undefined,
  keepSchoolId: string,
): Set<string> | null {
  if (!visibleSchoolIds || visibleSchoolIds.length === 0) return null;
  const allowed = new Set(
    visibleSchoolIds.map((id) => id.trim()).filter(Boolean),
  );
  const keep = keepSchoolId.trim();
  if (keep) allowed.add(keep);
  return allowed.size > 0 ? allowed : null;
}

/**
 * Cities that still have at least one school after applying the visible set
 * (plus the currently selected school). Empty / undefined visible → unchanged.
 * `allSchools` should be the full catalog so cities outside the current city
 * can be hidden correctly. Stale ids are ignored.
 */
export function filterVisibleCities(
  cities: City[],
  allSchools: School[],
  visibleSchoolIds: readonly string[] | null | undefined,
  keepSchoolId: string,
): City[] {
  const allowed = allowedSchoolIds(visibleSchoolIds, keepSchoolId);
  if (!allowed) return cities;

  const cityIds = new Set(
    allSchools
      .filter((school) => allowed.has(school.id))
      .map((school) => school.city.id),
  );
  if (cityIds.size === 0) return cities;
  return cities.filter((city) => cityIds.has(city.id));
}

/**
 * Narrow a (usually city-scoped) school list to the visible set, always
 * keeping the currently selected school. Empty / undefined → unchanged.
 */
export function filterVisibleSchools(
  schools: School[],
  visibleSchoolIds: readonly string[] | null | undefined,
  keepSchoolId: string,
): School[] {
  const allowed = allowedSchoolIds(visibleSchoolIds, keepSchoolId);
  if (!allowed) return schools;

  const filtered = schools.filter((school) => allowed.has(school.id));
  return filtered.length > 0 ? filtered : schools;
}

/** @deprecated Prefer filterVisibleCities + filterVisibleSchools. */
export function filterVisibleSchoolLists(
  cities: City[],
  schools: School[],
  visibleSchoolIds: readonly string[] | null | undefined,
  keepSchoolId: string,
): { cities: City[]; schools: School[] } {
  return {
    cities: filterVisibleCities(cities, schools, visibleSchoolIds, keepSchoolId),
    schools: filterVisibleSchools(schools, visibleSchoolIds, keepSchoolId),
  };
}
