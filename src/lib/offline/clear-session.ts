import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import { SELECTED_PLAN_STORAGE_KEY } from "@/lib/child-schedule/selected-plan";
import { LESSON_PLAN_STORAGE_KEY } from "@/lib/child-schedule/types";
import type { Schedule } from "@/lib/dowozy/types";
import { MZK_ROUTE_STORAGE_KEY } from "@/lib/mzk/route-preference";
import {
  clearOfflineEntitlement,
  syncOfflineEntitlement,
} from "./entitlement";
import {
  clearSchoolOfflineSnapshot,
  saveSchoolOfflineSnapshot,
  type SchoolOfflineCorrection,
} from "./school-cache";
import {
  OFFLINE_SHELL_CACHE,
  OFFLINE_WARM_DOCUMENT_PATHS,
  warmOfflineShell,
} from "./warm-shell";

const SHELL_PATHS_TO_DROP = new Set<string>(OFFLINE_WARM_DOCUMENT_PATHS);

/** Account-bound prefs cleared on logout (keep theme / onboarding hints). */
const USER_LOCAL_STORAGE_KEYS = [
  LESSON_PLAN_STORAGE_KEY,
  SELECTED_PLAN_STORAGE_KEY,
  MZK_ROUTE_STORAGE_KEY,
] as const;

/** Drop plan lekcji, selected plan, and MZK route from localStorage. */
export function clearUserLocalSettings(): void {
  if (typeof window === "undefined") return;
  for (const key of USER_LOCAL_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // private mode / quota
    }
  }
}

/** Serialize clear/persist so logout cleanup cannot wipe a later login. */
let sessionQueue: Promise<void> = Promise.resolve();

function enqueueSessionOp(op: () => Promise<void>): Promise<void> {
  const run = sessionQueue.then(op, op);
  sessionQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function clearShellDocuments(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(OFFLINE_SHELL_CACHE);
    const keys = await cache.keys();
    await Promise.all(
      keys.map(async (request) => {
        try {
          const pathname = new URL(request.url).pathname;
          if (SHELL_PATHS_TO_DROP.has(pathname)) {
            await cache.delete(request);
          }
        } catch {
          // ignore bad URLs
        }
      }),
    );
  } catch {
    // Quota / private mode
  }
}

/**
 * Drop Plus offline entitlement, IndexedDB snapshots, and cached app documents.
 * Queued so it cannot race a later {@link persistOfflinePlusSession}.
 */
export function clearOfflinePlusSession(): Promise<void> {
  return enqueueSessionOp(async () => {
    await clearSchoolOfflineSnapshot();
    await clearShellDocuments();
    clearOfflineEntitlement();
  });
}

/**
 * Persist Plus offline entitlement + schedule after login / while Plus is active.
 * Queued after any in-flight clear from logout.
 * Entitlement is only refreshed while online (never extends grace offline).
 */
export function persistOfflinePlusSession(opts: {
  validUntil?: string | null;
  schedule: Schedule | null;
  accountPlans?: AccountPlan[];
  mzkAvailable?: boolean;
  correction?: SchoolOfflineCorrection | null;
  online: boolean;
}): Promise<void> {
  return enqueueSessionOp(async () => {
    if (!opts.online) return;

    syncOfflineEntitlement({
      plusAccess: true,
      validUntil: opts.validUntil,
    });

    if (!opts.schedule) return;

    warmOfflineShell();

    try {
      await saveSchoolOfflineSnapshot({
        schedule: opts.schedule,
        accountPlans: opts.accountPlans ?? [],
        mzkAvailable: opts.mzkAvailable === true,
        correction: opts.correction,
      });
    } catch {
      // ignore quota / private mode
    }
  });
}
