import { cache } from "react";
import {
  fetchCitiesFromApi,
  fetchNoticesFromApi,
  fetchSchoolDetailFromApi,
  fetchSchoolPlacesFromApi,
  fetchSchoolsFromApi,
  getSchoolsApiBaseUrl,
} from "./api-client";
import type { City, PublicNotice, School, SchoolDetail } from "./types";

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

export async function loadSchoolDetailOnce(
  schoolId: string,
): Promise<SchoolDetail | null> {
  const id = schoolId.trim();
  if (!id) return null;
  const apiBase = getSchoolsApiBaseUrl();
  if (!apiBase) return null;
  const result = await fetchSchoolDetailFromApi(apiBase, id);
  return result.ok ? result.data : null;
}

export const loadSchoolDetail = cache(loadSchoolDetailOnce);

export async function loadSchoolNoticesOnce(
  schoolId: string,
): Promise<PublicNotice[]> {
  const id = schoolId.trim();
  if (!id) return [];
  const apiBase = getSchoolsApiBaseUrl();
  if (!apiBase) return [];
  const result = await fetchNoticesFromApi(apiBase, [id]);
  return result.ok ? result.data : [];
}

export const loadSchoolNotices = cache(loadSchoolNoticesOnce);
