import { cache } from "react";
import { fetchSchoolScheduleFromApi } from "@/lib/schools/api-client";
import {
  fetchDowozyScheduleFromApi,
  getDowozyApiBaseUrl,
} from "./api-client";
import { mapApiResponseToResolveInput } from "./map-api-schedule";
import { resolveScheduleSnapshot } from "./resolve-schedule";
import type {
  ScheduleCorrectionSnapshot,
  ScheduleSnapshotResult,
} from "./types";

/**
 * Loads the effective schedule for a school, plus correction metadata when the
 * school is a scraper school with `GET /api/v1/dowozy/schedule?schoolId=`.
 *
 * Prefer the dowozy wrapper (`original` + optional `modified`) so the home
 * banner and `/zmiany-w-rozkladzie` can show an active korekta. Fall back to
 * `GET /api/v1/schools/{id}/schedule` for dashboard schools (no wrapper).
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

  const wrapperResult = await fetchDowozyScheduleFromApi(apiBase, id);
  if (wrapperResult.ok) {
    const { original, modified: apiModified } = wrapperResult.data;
    const resolved = resolveScheduleSnapshot(
      mapApiResponseToResolveInput(wrapperResult.data),
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
