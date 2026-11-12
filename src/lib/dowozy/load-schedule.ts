import { cache } from "react";
import { getDowozyApiBaseUrl } from "./api-client";
import { fetchSchoolScheduleFromApi } from "@/lib/schools/api-client";
import type {
  ScheduleCorrectionSnapshot,
  ScheduleSnapshotResult,
} from "./types";

/**
 * Loads the effective schedule for a school.
 *
 * Uses `GET /api/v1/schools/{id}/schedule` (scraper or dashboard — resolved by backend).
 * Correction diff (original vs modified) is not available on this path; `modified` is always null.
 */
export async function loadScheduleCorrectionOnce(
  schoolId: string,
): Promise<ScheduleCorrectionSnapshot | null> {
  const id = schoolId.trim();
  if (!id) return null;

  const apiBase = getDowozyApiBaseUrl();
  if (!apiBase) {
    console.warn(
      "School schedule API base URL is unset (DOWOZY_API_BASE_URL); schedule unavailable.",
    );
    return null;
  }

  const apiResult = await fetchSchoolScheduleFromApi(apiBase, id);
  if (!apiResult.ok) {
    console.warn("School schedule API unavailable.", apiResult.reason);
    return null;
  }

  const schedule = apiResult.data;
  const resolved: ScheduleSnapshotResult = {
    schedule,
    source: "scrape",
    overrideStatus: "none",
  };

  return {
    original: schedule,
    modified: null,
    resolved,
  };
}

/**
 * Loads the school schedule for the whole app (UI, push, fingerprint).
 * Shares the same API path as {@link loadScheduleCorrectionOnce}.
 */
export async function loadScheduleSnapshotOnce(
  schoolId: string,
): Promise<ScheduleSnapshotResult | null> {
  const correction = await loadScheduleCorrectionOnce(schoolId);
  return correction?.resolved ?? null;
}

/** Cached correction context (shared within one RSC request; keyed by schoolId). */
export const loadScheduleCorrectionSnapshot = cache(
  loadScheduleCorrectionOnce,
);

/** Cached effective schedule; reuses {@link loadScheduleCorrectionSnapshot}. */
export const loadScheduleSnapshot = cache(async (schoolId: string) => {
  const correction = await loadScheduleCorrectionSnapshot(schoolId);
  return correction?.resolved ?? null;
});
