import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Schedule } from "./types";
import { DOWOZY_SNAPSHOT_PATH } from "./types";

export const loadScheduleSnapshot = cache(
  async (cwd: string = process.cwd()): Promise<Schedule | null> => {
    const filePath = path.join(cwd, DOWOZY_SNAPSHOT_PATH);

    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as Schedule;
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
