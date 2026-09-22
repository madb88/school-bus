import { readFile } from "node:fs/promises";
import path from "node:path";
import type { MzkSchedule } from "./types";
import { MZK_SNAPSHOT_PATH } from "./types";

export async function loadMzkScheduleSnapshot(
  cwd: string = process.cwd(),
): Promise<MzkSchedule | null> {
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
}
