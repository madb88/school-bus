import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { MzkSchedule } from "./types";
import { MZK_SNAPSHOT_PATH } from "./types";

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
      return JSON.parse(raw) as MzkSchedule;
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null;
      }
      throw error;
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
