import type { AccountPlan } from "@/lib/child-schedule/account-plan";
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

type SearchSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

function readPlanParam(source: SearchSource): string | null {
  if (!source) return null;
  const raw =
    source instanceof URLSearchParams ? source.get("plan") : source.plan;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

/**
 * Like `resolveServerSchoolContext`, but `?plan=<id>` of one of `plans` wins:
 * the plan's school (and its city) is loaded instead of `szkola`/`miasto`.
 */
export async function resolveServerSchoolContextForPlan(
  source: SearchSource,
  plans: AccountPlan[],
): Promise<Awaited<ReturnType<typeof resolveServerSchoolContext>>> {
  const planId = readPlanParam(source);
  const plan = planId ? plans.find((item) => item.id === planId) : undefined;
  if (plan) {
    const school = (await loadSchools()).find(
      (item) => item.id === plan.schoolId,
    );
    if (school) {
      return resolveServerSchoolContext({
        miasto: school.city.id,
        szkola: school.id,
      });
    }
  }
  return resolveServerSchoolContext(source);
}
