/**
 * Seed city/school from backend migration (Szkoła Olimpijczyków / Zielona Góra).
 * Soft-default so existing local prefs keep working on first multi-school deploy.
 */
export const DEFAULT_CITY_ID =
  "46b30a50-397b-4478-9af7-21cd486e9daa" as const;
export const DEFAULT_SCHOOL_ID =
  "2d6cdca6-4dc0-4cfc-b5a0-8286ac813680" as const;

export const SCHOOLS_API_CITIES_PATH = "/api/v1/cities" as const;
export const SCHOOLS_API_SCHOOLS_PATH = "/api/v1/schools" as const;
export const SCHOOLS_API_NOTICES_PATH = "/api/v1/notices" as const;

/** Max schools a signed-in user can pin in the board city/school picker. */
export const MAX_VISIBLE_SCHOOLS = 5;
