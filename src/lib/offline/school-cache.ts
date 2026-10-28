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

export type SchoolOfflineSnapshot = {
  schedule: Schedule;
  accountPlans: AccountPlan[];
  mzkAvailable: boolean;
  cachedAt: string;
};

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
  return {
    schedule: record.schedule,
    accountPlans,
    mzkAvailable: record.mzkAvailable === true,
    cachedAt: record.cachedAt,
  };
}

export async function saveSchoolOfflineSnapshot(input: {
  schedule: Schedule;
  accountPlans?: AccountPlan[];
  mzkAvailable?: boolean;
}): Promise<void> {
  const snapshot: SchoolOfflineSnapshot = {
    schedule: input.schedule,
    accountPlans: input.accountPlans ?? [],
    mzkAvailable: input.mzkAvailable === true,
    cachedAt: new Date().toISOString(),
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
  try {
    await idbClearStore(OFFLINE_STORE_SCHOOL);
    await idbClearStore(OFFLINE_STORE_MZK_OD);
  } catch {
    // Best-effort cleanup when entitlement is revoked.
  }
}
