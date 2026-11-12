import { cache } from "react";
import {
  fetchMzkMetaFromApi,
  fetchMzkScheduleFromApi,
  getMzkApiBaseUrl,
} from "./api-client";
import { mzkMetaFromSchedule } from "./meta";
import type { MzkSchedule } from "./types";
import type { MzkScheduleMetaFile } from "./types";

export type MzkScheduleMeta = MzkScheduleMetaFile;

export { mzkMetaFromSchedule };

/**
 * Loads the MZK schedule for a school (city feed filtered by school stops).
 *
 * Requires `DOWOZY_API_BASE_URL` and `schoolId`. On failure returns null.
 */
export async function loadMzkScheduleSnapshotOnce(
  schoolId: string,
): Promise<MzkSchedule | null> {
  const id = schoolId.trim();
  if (!id) return null;

  const apiBase = getMzkApiBaseUrl();
  if (!apiBase) {
    console.warn(
      "MZK schedule API base URL is unset (DOWOZY_API_BASE_URL); schedule unavailable.",
    );
    return null;
  }

  const apiResult = await fetchMzkScheduleFromApi(apiBase, id);
  if (apiResult.ok) return apiResult.data;

  console.warn("MZK schedule API unavailable.", apiResult.reason);
  return null;
}

export const loadMzkScheduleSnapshot = cache(loadMzkScheduleSnapshotOnce);

/**
 * Lightweight fields for SSR chrome (fetchedAt / attribution).
 * Requires `DOWOZY_API_BASE_URL` → GET /api/v1/mzk/meta?schoolId=.
 */
export async function loadMzkScheduleMetaOnce(
  schoolId: string,
): Promise<MzkScheduleMeta | null> {
  const id = schoolId.trim();
  if (!id) return null;

  const apiBase = getMzkApiBaseUrl();
  if (!apiBase) {
    console.warn(
      "MZK meta API base URL is unset (DOWOZY_API_BASE_URL); meta unavailable.",
    );
    return null;
  }

  const apiResult = await fetchMzkMetaFromApi(apiBase, id);
  if (apiResult.ok) return apiResult.data;

  console.warn("MZK meta API unavailable.", apiResult.reason);
  return null;
}

export const loadMzkScheduleMeta = cache(loadMzkScheduleMetaOnce);
