import { DEFAULT_CITY_ID, DEFAULT_SCHOOL_ID } from "./constants";
import { loadCities, loadSchools } from "./load";
import { parseSchoolFilterParams } from "./resolve-selection";
import type { City, School, SchoolSelection } from "./types";

/**
 * Resolve city/school for RSC using URL params, then soft-defaults,
 * ensuring the school belongs to the chosen city when lists are available.
 */
export async function resolveServerSchoolContext(
  source:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | undefined,
): Promise<{
  selection: SchoolSelection;
  cities: City[];
  schools: School[];
  school: School | null;
}> {
  const cities = await loadCities();
  const parsed = source ? parseSchoolFilterParams(source) : null;

  let cityId = parsed?.cityId ?? DEFAULT_CITY_ID;
  if (cities.length > 0 && !cities.some((c) => c.id === cityId)) {
    cityId = cities[0]!.id;
  }

  const schools = await loadSchools(cityId);
  let schoolId = parsed?.schoolId ?? DEFAULT_SCHOOL_ID;
  if (schools.length > 0 && !schools.some((s) => s.id === schoolId)) {
    schoolId = schools[0]!.id;
  }
  if (schools.length === 0) {
    schoolId = parsed?.schoolId ?? DEFAULT_SCHOOL_ID;
  }

  const school = schools.find((s) => s.id === schoolId) ?? null;
  return {
    selection: { cityId, schoolId },
    cities,
    schools,
    school,
  };
}
