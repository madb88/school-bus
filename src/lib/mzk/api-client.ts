import {
  getDowozyApiBaseUrl,
  isDowozyApiHealthy,
} from "@/lib/dowozy/api-client";
import {
  MZK_API_META_PATH,
  MZK_API_SCHEDULE_PATH,
  type MzkSchedule,
  type MzkScheduleMetaFile,
} from "./types";
import { isMzkScheduleMeta, isMzkScheduleSnapshot } from "./validate-schedule";

const SCHEDULE_TIMEOUT_MS = 10_000;
const META_TIMEOUT_MS = 5_000;

export { getDowozyApiBaseUrl as getMzkApiBaseUrl };

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export type FetchMzkApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unhealthy" | "http" | "invalid" | "network" };

/**
 * Probe /health, then GET /api/v1/mzk/schedule.
 * Callers use local JSON only when DOWOZY_API_BASE_URL is unset.
 */
export async function fetchMzkScheduleFromApi(
  baseUrl: string,
): Promise<FetchMzkApiResult<MzkSchedule>> {
  const healthy = await isDowozyApiHealthy(baseUrl);
  if (!healthy) return { ok: false, reason: "unhealthy" };

  const url = `${baseUrl}${MZK_API_SCHEDULE_PATH}`;
  try {
    const res = await fetchWithTimeout(url, SCHEDULE_TIMEOUT_MS);
    if (!res.ok) {
      console.warn("MZK schedule API returned non-OK status:", url, res.status);
      return { ok: false, reason: "http" };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      console.warn("MZK schedule API returned invalid JSON:", url);
      return { ok: false, reason: "invalid" };
    }
    if (!isMzkScheduleSnapshot(parsed)) {
      console.warn("MZK schedule API response has unexpected shape:", url);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    console.warn("MZK schedule API fetch failed:", url, error);
    return { ok: false, reason: "network" };
  }
}

/**
 * Probe /health, then GET /api/v1/mzk/meta.
 * Callers use local JSON only when DOWOZY_API_BASE_URL is unset.
 */
export async function fetchMzkMetaFromApi(
  baseUrl: string,
): Promise<FetchMzkApiResult<MzkScheduleMetaFile>> {
  const healthy = await isDowozyApiHealthy(baseUrl);
  if (!healthy) return { ok: false, reason: "unhealthy" };

  const url = `${baseUrl}${MZK_API_META_PATH}`;
  try {
    const res = await fetchWithTimeout(url, META_TIMEOUT_MS);
    if (!res.ok) {
      console.warn("MZK meta API returned non-OK status:", url, res.status);
      return { ok: false, reason: "http" };
    }
    let parsed: unknown;
    try {
      parsed = await res.json();
    } catch {
      console.warn("MZK meta API returned invalid JSON:", url);
      return { ok: false, reason: "invalid" };
    }
    if (!isMzkScheduleMeta(parsed)) {
      console.warn("MZK meta API response has unexpected shape:", url);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    console.warn("MZK meta API fetch failed:", url, error);
    return { ok: false, reason: "network" };
  }
}
