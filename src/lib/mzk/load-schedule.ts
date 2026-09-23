import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { MzkSchedule } from "./types";
import { MZK_SNAPSHOT_PATH } from "./types";
import { isMzkScheduleSnapshot } from "./validate-schedule";

export type MzkScheduleMeta = {
  sourceUrl: string;
  attribution: string;
  fetchedAt: string;
  feedStartDate: string;
  feedEndDate: string;
  stopCount: number;
  tripCount: number;
};

export const loadMzkScheduleSnapshot = cache(
  async (cwd: string = process.cwd()): Promise<MzkSchedule | null> => {
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
  },
);

/** Lightweight fields for SSR chrome — avoids passing trips into client trees. */
export async function loadMzkScheduleMeta(
  cwd: string = process.cwd(),
): Promise<MzkScheduleMeta | null> {
  const schedule = await loadMzkScheduleSnapshot(cwd);
  if (!schedule) return null;
  return {
    sourceUrl: schedule.sourceUrl,
    attribution: schedule.attribution,
    fetchedAt: schedule.fetchedAt,
    feedStartDate: schedule.feedStartDate,
    feedEndDate: schedule.feedEndDate,
    stopCount: schedule.stops.length,
    tripCount: schedule.trips.length,
  };
}
