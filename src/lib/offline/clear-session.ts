import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import type { Schedule } from "@/lib/dowozy/types";
import {
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import {
  clearOfflineEntitlement,
  syncOfflineEntitlement,
} from "./entitlement";
import { prefetchMzkOdForRoute } from "./prefetch-mzk-od";
import {
  clearSchoolOfflineSnapshot,
  saveSchoolOfflineSnapshot,
} from "./school-cache";
import { OFFLINE_SHELL_CACHE, warmOfflineShell } from "./warm-shell";

const SHELL_PATHS_TO_DROP = new Set([
  "/",
  "/lekcje",
  "/offline",
  "/offline.html",
]);

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
 */
export function persistOfflinePlusSession(opts: {
  validUntil?: string | null;
  schedule: Schedule | null;
  accountPlans?: AccountPlan[];
  mzkAvailable?: boolean;
  online: boolean;
}): Promise<void> {
  return enqueueSessionOp(async () => {
    syncOfflineEntitlement({
      plusAccess: true,
      validUntil: opts.validUntil,
    });

    if (!opts.online || !opts.schedule) return;

    warmOfflineShell();

    try {
      await saveSchoolOfflineSnapshot({
        schedule: opts.schedule,
        accountPlans: opts.accountPlans ?? [],
        mzkAvailable: opts.mzkAvailable === true,
      });
    } catch {
      // ignore quota / private mode
    }

    const route = loadMzkRoutePreference();
    if (
      opts.mzkAvailable &&
      hasConfiguredMzkRoute(route) &&
      route.boardStopId &&
      route.alightStopId
    ) {
      await prefetchMzkOdForRoute({
        boardStopId: route.boardStopId,
        alightStopId: route.alightStopId,
        route: route.route,
      });
    }
  });
}
