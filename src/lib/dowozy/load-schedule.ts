import { cache } from "react";
import { fetchDowozyScheduleFromApi, getDowozyApiBaseUrl } from "./api-client";
import { mapApiResponseToResolveInput } from "./map-api-schedule";
import type {
  ScheduleCorrectionSnapshot,
  ScheduleSnapshotResult,
} from "./types";
import { resolveScheduleSnapshot } from "./resolve-schedule";

/**
 * Loads original + active correction (+ resolved effective schedule).
 *
 * Requires `DOWOZY_API_BASE_URL`. On failure returns null (unavailable UI).
 * Repo JSON under `data/` is not used by the app.
 */
export async function loadScheduleCorrectionOnce(): Promise<ScheduleCorrectionSnapshot | null> {
  const apiBase = getDowozyApiBaseUrl();
  if (!apiBase) {
    console.warn(
      "School schedule API base URL is unset (DOWOZY_API_BASE_URL); schedule unavailable.",
    );
    return null;
  }

  const apiResult = await fetchDowozyScheduleFromApi(apiBase);
  if (!apiResult.ok) {
    console.warn("School schedule API unavailable.", apiResult.reason);
    return null;
  }

  const { original, modified: apiModified } = apiResult.data;
  const resolved = resolveScheduleSnapshot(
    mapApiResponseToResolveInput(apiResult.data),
  );

  const activeUntil =
    typeof apiModified?.activeUntil === "string" &&
    apiModified.activeUntil.trim() !== ""
      ? apiModified.activeUntil.trim()
      : undefined;

  const modified =
    resolved.source === "override" &&
    apiModified?.schedule &&
    typeof apiModified.schedule === "object"
      ? apiModified.schedule
      : null;

  return {
    original,
    modified,
    ...(activeUntil && modified ? { activeUntil } : {}),
    resolved,
  };
}

/**
 * Loads the school schedule for the whole app (UI, push, fingerprint).
 * Shares the same API path as {@link loadScheduleCorrectionOnce}.
 */
export async function loadScheduleSnapshotOnce(): Promise<ScheduleSnapshotResult | null> {
  const correction = await loadScheduleCorrectionOnce();
  return correction?.resolved ?? null;
}

/** Cached correction context (shared within one RSC request). */
export const loadScheduleCorrectionSnapshot = cache(
  loadScheduleCorrectionOnce,
);

/** Cached effective schedule; reuses {@link loadScheduleCorrectionSnapshot}. */
export const loadScheduleSnapshot = cache(async () => {
  const correction = await loadScheduleCorrectionSnapshot();
  return correction?.resolved ?? null;
});
