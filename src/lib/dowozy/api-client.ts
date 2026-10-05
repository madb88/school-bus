import {
  DOWOZY_API_HEALTH_PATH,
  DOWOZY_API_SCHEDULE_PATH,
  type DowozyApiScheduleResponse,
} from "./types";
import { isDowozyApiScheduleResponse } from "./validate-api-schedule";

const HEALTH_TIMEOUT_MS = 2_000;
const SCHEDULE_TIMEOUT_MS = 10_000;

export function getDowozyApiBaseUrl(): string | null {
  const raw = process.env.DOWOZY_API_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

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

/** True when GET /health returns 2xx within the short timeout. */
export async function isDowozyApiHealthy(baseUrl: string): Promise<boolean> {
  const url = `${baseUrl}${DOWOZY_API_HEALTH_PATH}`;
  try {
    const res = await fetchWithTimeout(url, HEALTH_TIMEOUT_MS);
    return res.ok;
  } catch (error) {
    console.warn("School schedule API health check failed:", url, error);
    return false;
  }
}

export type FetchScheduleApiResult =
  | { ok: true; data: DowozyApiScheduleResponse }
  | { ok: false; reason: "unhealthy" | "http" | "invalid" | "network" };

/**
 * Probe /health, then GET /api/v1/dowozy/schedule.
 * Callers fall back to local JSON when ok is false.
 */
export async function fetchDowozyScheduleFromApi(
  baseUrl: string,
): Promise<FetchScheduleApiResult> {
  const healthy = await isDowozyApiHealthy(baseUrl);
  if (!healthy) return { ok: false, reason: "unhealthy" };

  const url = `${baseUrl}${DOWOZY_API_SCHEDULE_PATH}`;
  try {
    const res = await fetchWithTimeout(url, SCHEDULE_TIMEOUT_MS);
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
    if (!isDowozyApiScheduleResponse(parsed)) {
      console.warn("School schedule API response has unexpected shape:", url);
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    console.warn("School schedule API fetch failed:", url, error);
    return { ok: false, reason: "network" };
  }
}
