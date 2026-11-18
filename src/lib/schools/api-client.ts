import {
  getDowozyApiBaseUrl,
  isDowozyApiHealthy,
} from "@/lib/dowozy/api-client";
import { isScheduleSnapshot } from "@/lib/dowozy/validate-schedule";
import type { Schedule } from "@/lib/dowozy/types";
import {
  SCHEDULE_API_REVALIDATE_SEC,
  SCHEDULE_API_TAGS,
  schoolNoticesTag,
  schoolScheduleTag,
  schoolPlacesTag,
} from "@/lib/schedule-api-cache";
import {
  SCHOOLS_API_CITIES_PATH,
  SCHOOLS_API_NOTICES_PATH,
  SCHOOLS_API_SCHOOLS_PATH,
} from "./constants";
import { parsePublicNotices } from "./notices";
import type { City, PublicNotice, School } from "./types";
import { parseCities, parsePlacesList, parseSchools } from "./validate";

const LIST_TIMEOUT_MS = 8_000;
const SCHEDULE_TIMEOUT_MS = 10_000;

export type FetchSchoolsApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unhealthy" | "http" | "invalid" | "network" };

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  next: { revalidate: number; tags: string[] },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      next,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function getSchoolsApiBaseUrl(): string | null {
  return getDowozyApiBaseUrl();
}

export async function fetchCitiesFromApi(
  baseUrl: string,
): Promise<FetchSchoolsApiResult<City[]>> {
  const healthy = await isDowozyApiHealthy(baseUrl);
  if (!healthy) return { ok: false, reason: "unhealthy" };

  const url = `${baseUrl}${SCHOOLS_API_CITIES_PATH}`;
  try {
    const res = await fetchWithTimeout(url, LIST_TIMEOUT_MS, {
      revalidate: SCHEDULE_API_REVALIDATE_SEC,
      tags: [SCHEDULE_API_TAGS.cities],
    });
    if (!res.ok) {
      console.warn("Cities API returned non-OK status:", url, res.status);
      return { ok: false, reason: "http" };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      console.warn("Cities API returned invalid JSON:", url);
      return { ok: false, reason: "invalid" };
    }
    const cities = parseCities(parsed);
    if (!cities) {
      console.warn("Cities API response has unexpected shape:", url);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: cities };
  } catch (error) {
    console.warn("Cities API fetch failed:", url, error);
    return { ok: false, reason: "network" };
  }
}

export async function fetchSchoolsFromApi(
  baseUrl: string,
  cityId?: string | null,
): Promise<FetchSchoolsApiResult<School[]>> {
  const healthy = await isDowozyApiHealthy(baseUrl);
  if (!healthy) return { ok: false, reason: "unhealthy" };

  const params = new URLSearchParams();
  if (cityId?.trim()) params.set("cityId", cityId.trim());
  const qs = params.toString();
  const url = `${baseUrl}${SCHOOLS_API_SCHOOLS_PATH}${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetchWithTimeout(url, LIST_TIMEOUT_MS, {
      revalidate: SCHEDULE_API_REVALIDATE_SEC,
      tags: [
        SCHEDULE_API_TAGS.schools,
        ...(cityId?.trim()
          ? [`${SCHEDULE_API_TAGS.schools}:${cityId.trim()}`]
          : []),
      ],
    });
    if (!res.ok) {
      console.warn("Schools API returned non-OK status:", url, res.status);
      return { ok: false, reason: "http" };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      console.warn("Schools API returned invalid JSON:", url);
      return { ok: false, reason: "invalid" };
    }
    const schools = parseSchools(parsed);
    if (!schools) {
      console.warn("Schools API response has unexpected shape:", url);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: schools };
  } catch (error) {
    console.warn("Schools API fetch failed:", url, error);
    return { ok: false, reason: "network" };
  }
}

export async function fetchSchoolScheduleFromApi(
  baseUrl: string,
  schoolId: string,
): Promise<FetchSchoolsApiResult<Schedule>> {
  const id = schoolId.trim();
  if (!id) return { ok: false, reason: "invalid" };

  const healthy = await isDowozyApiHealthy(baseUrl);
  if (!healthy) return { ok: false, reason: "unhealthy" };

  const url = `${baseUrl}${SCHOOLS_API_SCHOOLS_PATH}/${encodeURIComponent(id)}/schedule`;
  try {
    const res = await fetchWithTimeout(url, SCHEDULE_TIMEOUT_MS, {
      revalidate: SCHEDULE_API_REVALIDATE_SEC,
      tags: [SCHEDULE_API_TAGS.dowozy, schoolScheduleTag(id)],
    });
    if (!res.ok) {
      console.warn(
        "School schedule API returned non-OK status:",
        url,
        res.status,
      );
      return { ok: false, reason: "http" };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      console.warn("School schedule API returned invalid JSON:", url);
      return { ok: false, reason: "invalid" };
    }
    if (!isScheduleSnapshot(parsed)) {
      console.warn("School schedule API response has unexpected shape:", url);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    console.warn("School schedule API fetch failed:", url, error);
    return { ok: false, reason: "network" };
  }
}

export async function fetchSchoolPlacesFromApi(
  baseUrl: string,
  schoolId: string,
): Promise<FetchSchoolsApiResult<string[]>> {
  const id = schoolId.trim();
  if (!id) return { ok: false, reason: "invalid" };

  const healthy = await isDowozyApiHealthy(baseUrl);
  if (!healthy) return { ok: false, reason: "unhealthy" };

  const url = `${baseUrl}${SCHOOLS_API_SCHOOLS_PATH}/${encodeURIComponent(id)}/places`;
  try {
    const res = await fetchWithTimeout(url, LIST_TIMEOUT_MS, {
      revalidate: SCHEDULE_API_REVALIDATE_SEC,
      tags: [SCHEDULE_API_TAGS.places, schoolPlacesTag(id)],
    });
    if (!res.ok) {
      console.warn("School places API returned non-OK status:", url, res.status);
      return { ok: false, reason: "http" };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      console.warn("School places API returned invalid JSON:", url);
      return { ok: false, reason: "invalid" };
    }
    const places = parsePlacesList(parsed);
    if (!places) {
      console.warn("School places API response has unexpected shape:", url);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: places };
  } catch (error) {
    console.warn("School places API fetch failed:", url, error);
    return { ok: false, reason: "network" };
  }
}

export async function fetchNoticesFromApi(
  baseUrl: string,
  schoolIds: string[],
): Promise<FetchSchoolsApiResult<PublicNotice[]>> {
  const uniqueIds = [
    ...new Set(
      schoolIds.map((id) => id.trim()).filter((id) => id.length > 0),
    ),
  ].slice(0, 10);
  if (uniqueIds.length === 0) return { ok: false, reason: "invalid" };

  const healthy = await isDowozyApiHealthy(baseUrl);
  if (!healthy) return { ok: false, reason: "unhealthy" };

  const params = new URLSearchParams();
  for (const id of uniqueIds) {
    params.append("schoolId", id);
  }
  const url = `${baseUrl}${SCHOOLS_API_NOTICES_PATH}?${params.toString()}`;
  try {
    const res = await fetchWithTimeout(url, LIST_TIMEOUT_MS, {
      revalidate: SCHEDULE_API_REVALIDATE_SEC,
      tags: [
        SCHEDULE_API_TAGS.notices,
        ...uniqueIds.map((id) => schoolNoticesTag(id)),
      ],
    });
    if (!res.ok) {
      console.warn("Notices API returned non-OK status:", url, res.status);
      return { ok: false, reason: "http" };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      console.warn("Notices API returned invalid JSON:", url);
      return { ok: false, reason: "invalid" };
    }
    const notices = parsePublicNotices(parsed);
    if (!notices) {
      console.warn("Notices API response has unexpected shape:", url);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: notices };
  } catch (error) {
    console.warn("Notices API fetch failed:", url, error);
    return { ok: false, reason: "network" };
  }
}
