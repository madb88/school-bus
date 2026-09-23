import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Schedule } from "./types";
import { DOWOZY_SNAPSHOT_PATH } from "./types";
import { isScheduleSnapshot } from "./validate-schedule";

export const loadScheduleSnapshot = cache(
  async (cwd: string = process.cwd()): Promise<Schedule | null> => {
    const filePath = path.join(cwd, DOWOZY_SNAPSHOT_PATH);

    try {
      const raw = await readFile(filePath, "utf8");
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error("Invalid JSON in school schedule snapshot:", filePath);
        return null;
      }
      if (!isScheduleSnapshot(parsed)) {
        console.error("Unexpected school schedule snapshot shape:", filePath);
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
      console.error("Failed to load school schedule snapshot:", error);
      return null;
    }
  },
);
