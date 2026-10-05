import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import {
  fetchMzkMetaFromApi,
  fetchMzkScheduleFromApi,
  getMzkApiBaseUrl,
} from "./api-client";
import { mzkMetaFromSchedule } from "./meta";
import type { MzkSchedule } from "./types";
import {
  MZK_META_PATH,
  MZK_SNAPSHOT_PATH,
  type MzkScheduleMetaFile,
} from "./types";
import { isMzkScheduleMeta, isMzkScheduleSnapshot } from "./validate-schedule";

export type MzkScheduleMeta = MzkScheduleMetaFile;

export { mzkMetaFromSchedule };

async function loadMzkScheduleFromFile(
  cwd: string,
): Promise<MzkSchedule | null> {
  const filePath = path.join(cwd, MZK_SNAPSHOT_PATH);

  try {
    const raw = await readFile(filePath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Invalid JSON in MZK schedule snapshot:", filePath);
      return null;
    }
    if (!isMzkScheduleSnapshot(parsed)) {
      console.error("Unexpected MZK schedule snapshot shape:", filePath);
      return null;
    }
    return parsed;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    console.error("Failed to load MZK schedule snapshot:", error);
    return null;
  }
}

async function loadMzkMetaFromFile(
  cwd: string,
): Promise<MzkScheduleMeta | null> {
  const filePath = path.join(cwd, MZK_META_PATH);

  try {
    const raw = await readFile(filePath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Invalid JSON in MZK schedule meta:", filePath);
      return null;
    }
    if (!isMzkScheduleMeta(parsed)) {
      console.error("Unexpected MZK schedule meta shape:", filePath);
      return null;
    }
    return parsed;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    console.error("Failed to load MZK schedule meta:", error);
    return null;
  }
}

/**
 * Loads the MZK schedule for the whole app (UI, OD API).
 *
 * - Default (no DOWOZY_API_BASE_URL): repo JSON snapshots — production path.
 * - When DOWOZY_API_BASE_URL is set (local): GET /health then MZK schedule API only;
 *   on failure returns null (no JSON file fallback — shows unavailable UI).
 */
export async function loadMzkScheduleSnapshotOnce(
  cwd: string = process.cwd(),
): Promise<MzkSchedule | null> {
  const apiBase = getMzkApiBaseUrl();
  if (apiBase) {
    const apiResult = await fetchMzkScheduleFromApi(apiBase);
    if (apiResult.ok) return apiResult.data;
    console.warn(
      "MZK schedule API unavailable; not using local JSON snapshots.",
      apiResult.reason,
    );
    return null;
  }

  return loadMzkScheduleFromFile(cwd);
}

export const loadMzkScheduleSnapshot = cache(loadMzkScheduleSnapshotOnce);

/**
 * Lightweight fields for SSR chrome.
 *
 * - Default: prefers meta sidecar, else derives from full snapshot.
 * - When DOWOZY_API_BASE_URL is set: GET /api/v1/mzk/meta only (no file fallback).
 */
export async function loadMzkScheduleMeta(
  cwd: string = process.cwd(),
): Promise<MzkScheduleMeta | null> {
  const apiBase = getMzkApiBaseUrl();
  if (apiBase) {
    const apiResult = await fetchMzkMetaFromApi(apiBase);
    if (apiResult.ok) return apiResult.data;
    console.warn(
      "MZK meta API unavailable; not using local JSON snapshots.",
      apiResult.reason,
    );
    return null;
  }

  const fromSidecar = await loadMzkMetaFromFile(cwd);
  if (fromSidecar) return fromSidecar;

  const schedule = await loadMzkScheduleSnapshot(cwd);
  if (!schedule) return null;
  return mzkMetaFromSchedule(schedule);
}
