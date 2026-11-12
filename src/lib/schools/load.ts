import { cache } from "react";
import {
  fetchCitiesFromApi,
  fetchSchoolPlacesFromApi,
  fetchSchoolsFromApi,
  getSchoolsApiBaseUrl,
} from "./api-client";
import type { City, School } from "./types";

export async function loadCitiesOnce(): Promise<City[]> {
  const apiBase = getSchoolsApiBaseUrl();
  if (!apiBase) return [];
  const result = await fetchCitiesFromApi(apiBase);
  return result.ok ? result.data : [];
}

export const loadCities = cache(loadCitiesOnce);

export async function loadSchoolsOnce(cityId?: string | null): Promise<School[]> {
  const apiBase = getSchoolsApiBaseUrl();
  if (!apiBase) return [];
  const result = await fetchSchoolsFromApi(apiBase, cityId);
  return result.ok ? result.data : [];
}

export const loadSchools = cache(loadSchoolsOnce);

export async function loadSchoolPlacesOnce(
  schoolId: string,
): Promise<string[]> {
  const id = schoolId.trim();
  if (!id) return [];
  const apiBase = getSchoolsApiBaseUrl();
  if (!apiBase) return [];
  const result = await fetchSchoolPlacesFromApi(apiBase, id);
  return result.ok ? result.data : [];
}

export const loadSchoolPlaces = cache(loadSchoolPlacesOnce);

export async function loadSchoolByIdOnce(
  schoolId: string,
): Promise<School | null> {
  const id = schoolId.trim();
  if (!id) return null;
  const schools = await loadSchoolsOnce();
  return schools.find((s) => s.id === id) ?? null;
}

export const loadSchoolById = cache(loadSchoolByIdOnce);
