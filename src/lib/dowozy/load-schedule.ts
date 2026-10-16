import { cache } from "react";
import { fetchDowozyScheduleFromApi, getDowozyApiBaseUrl } from "./api-client";
import { mapApiResponseToResolveInput } from "./map-api-schedule";
import type { ScheduleSnapshotResult } from "./types";
import { resolveScheduleSnapshot } from "./resolve-schedule";

/**
 * Loads the school schedule for the whole app (UI, push, fingerprint).
 *
 * Requires `DOWOZY_API_BASE_URL`. On failure returns null (unavailable UI).
 * Repo JSON under `data/` is not used by the app.
 */
export async function loadScheduleSnapshotOnce(): Promise<ScheduleSnapshotResult | null> {
  const apiBase = getDowozyApiBaseUrl();
  if (!apiBase) {
    console.warn(
      "School schedule API base URL is unset (DOWOZY_API_BASE_URL); schedule unavailable.",
    );
    return null;
  }

  const apiResult = await fetchDowozyScheduleFromApi(apiBase);
  if (apiResult.ok) {
    return resolveScheduleSnapshot(mapApiResponseToResolveInput(apiResult.data));
  }

  console.warn("School schedule API unavailable.", apiResult.reason);
  return null;
}

export const loadScheduleSnapshot = cache(loadScheduleSnapshotOnce);
