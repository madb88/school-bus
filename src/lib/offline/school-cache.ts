import {
  parseAccountPlan,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import { isScheduleSnapshot } from "@/lib/dowozy/validate-schedule";
import type { Schedule } from "@/lib/dowozy/types";
import {
  OFFLINE_SCHOOL_KEY,
  OFFLINE_STORE_MZK_OD,
  OFFLINE_STORE_SCHOOL,
} from "./constants";
import { idbClearStore, idbGet, idbSet } from "./idb";

/** Original + optional active correction for `/zmiany-w-rozkladzie` offline. */
export type SchoolOfflineCorrection = {
  original: Schedule;
  modified: Schedule | null;
  activeUntil?: string;
};

export type SchoolOfflineSnapshot = {
  schedule: Schedule;
  accountPlans: AccountPlan[];
  mzkAvailable: boolean;
  cachedAt: string;
  correction?: SchoolOfflineCorrection | null;
};

function parseOfflineCorrection(raw: unknown): SchoolOfflineCorrection | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isScheduleSnapshot(record.original)) return null;
  const modified =
    record.modified == null
      ? null
      : isScheduleSnapshot(record.modified)
        ? record.modified
        : null;
  if (record.modified != null && modified == null) return null;
  const activeUntil =
    typeof record.activeUntil === "string" && record.activeUntil.trim() !== ""
      ? record.activeUntil.trim()
      : undefined;
  return {
    original: record.original,
    modified,
    ...(activeUntil && modified ? { activeUntil } : {}),
  };
}

export function parseSchoolOfflineSnapshot(
  raw: unknown,
): SchoolOfflineSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isScheduleSnapshot(record.schedule)) return null;
  if (typeof record.cachedAt !== "string" || !record.cachedAt) return null;
  const accountPlans = Array.isArray(record.accountPlans)
    ? record.accountPlans
        .map(parseAccountPlan)
        .filter((plan): plan is AccountPlan => plan != null)
    : [];
  const correction =
    record.correction === undefined
      ? undefined
      : parseOfflineCorrection(record.correction);
  if (record.correction !== undefined && record.correction !== null && !correction) {
    return null;
  }
  return {
    schedule: record.schedule,
    accountPlans,
    mzkAvailable: record.mzkAvailable === true,
    cachedAt: record.cachedAt,
    ...(correction !== undefined ? { correction } : {}),
  };
}

export async function saveSchoolOfflineSnapshot(input: {
  schedule: Schedule;
  accountPlans?: AccountPlan[];
  mzkAvailable?: boolean;
  correction?: SchoolOfflineCorrection | null;
}): Promise<void> {
  const snapshot: SchoolOfflineSnapshot = {
    schedule: input.schedule,
    accountPlans: input.accountPlans ?? [],
    mzkAvailable: input.mzkAvailable === true,
    cachedAt: new Date().toISOString(),
    ...(input.correction !== undefined
      ? { correction: input.correction }
      : {}),
  };
  await idbSet(OFFLINE_STORE_SCHOOL, OFFLINE_SCHOOL_KEY, snapshot);
}

export async function loadSchoolOfflineSnapshot(): Promise<SchoolOfflineSnapshot | null> {
  try {
    const raw = await idbGet<unknown>(OFFLINE_STORE_SCHOOL, OFFLINE_SCHOOL_KEY);
    return parseSchoolOfflineSnapshot(raw);
  } catch {
    return null;
  }
}

export async function clearSchoolOfflineSnapshot(): Promise<void> {
  async function clearOnce(): Promise<void> {
    await idbClearStore(OFFLINE_STORE_SCHOOL);
    await idbClearStore(OFFLINE_STORE_MZK_OD);
  }
  try {
    await clearOnce();
  } catch {
    try {
      await clearOnce();
    } catch {
      // Best-effort cleanup when entitlement is revoked (retry once).
    }
  }
}
