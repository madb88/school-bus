import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
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

const loadMzkMetaSidecar = cache(
  async (cwd: string = process.cwd()): Promise<MzkScheduleMeta | null> => {
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
  },
);

/** Lightweight fields for SSR chrome — prefers sidecar over full snapshot parse. */
export async function loadMzkScheduleMeta(
  cwd: string = process.cwd(),
): Promise<MzkScheduleMeta | null> {
  const fromSidecar = await loadMzkMetaSidecar(cwd);
  if (fromSidecar) return fromSidecar;

  const schedule = await loadMzkScheduleSnapshot(cwd);
  if (!schedule) return null;
  return mzkMetaFromSchedule(schedule);
}
