import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { DowozyOverride, Schedule, ScheduleSnapshotResult } from "./types";
import { DOWOZY_OVERRIDES_PATH, DOWOZY_SNAPSHOT_PATH } from "./types";
import { resolveScheduleSnapshot } from "./resolve-schedule";
import { isDowozyOverride } from "./validate-override";
import { isScheduleSnapshot } from "./validate-schedule";

async function loadBaseSchedule(cwd: string): Promise<Schedule | null> {
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
}

type OverrideLoad =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "ok"; override: DowozyOverride };

async function loadOverrideFile(cwd: string): Promise<OverrideLoad> {
  const filePath = path.join(cwd, DOWOZY_OVERRIDES_PATH);

  try {
    const raw = await readFile(filePath, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn("Invalid JSON in school schedule override:", filePath);
      return { kind: "invalid" };
    }
    if (!isDowozyOverride(parsed)) {
      console.warn("Unexpected school schedule override shape:", filePath);
      return { kind: "invalid" };
    }
    return { kind: "ok", override: parsed };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return { kind: "absent" };
    }
    console.warn("Failed to read school schedule override:", filePath, error);
    return { kind: "invalid" };
  }
}

/**
 * Loads the scrape snapshot and optional manual override, then returns the
 * effective schedule for the whole app (UI, push, fingerprint).
 */
export const loadScheduleSnapshot = cache(
  async (
    cwd: string = process.cwd(),
  ): Promise<ScheduleSnapshotResult | null> => {
    const base = await loadBaseSchedule(cwd);
    if (!base) return null;

    const overrideLoad = await loadOverrideFile(cwd);

    if (overrideLoad.kind === "invalid") {
      return resolveScheduleSnapshot({
        base,
        override: null,
        overrideInvalid: true,
      });
    }

    if (overrideLoad.kind === "absent") {
      return resolveScheduleSnapshot({ base, override: null });
    }

    const { override } = overrideLoad;
    if (
      override.active &&
      (!override.schedule || !isScheduleSnapshot(override.schedule))
    ) {
      console.warn(
        "Active school schedule override is missing a valid schedule; using scrape snapshot.",
      );
      return resolveScheduleSnapshot({
        base,
        override: null,
        overrideInvalid: true,
      });
    }

    return resolveScheduleSnapshot({ base, override });
  },
);
