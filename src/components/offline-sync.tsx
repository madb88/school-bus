"use client";

import { useEffect } from "react";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import type { Schedule } from "@/lib/dowozy/types";
import { clearOfflinePlusSession } from "@/lib/offline/clear-session";
import { syncOfflineEntitlement } from "@/lib/offline/entitlement";
import { saveSchoolOfflineSnapshot } from "@/lib/offline/school-cache";
import { prefetchMzkOdForRoute } from "@/lib/offline/prefetch-mzk-od";
import {
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { warmOfflineShell } from "@/lib/offline/warm-shell";

type OfflineSyncProps = {
  plusAccess: boolean;
  plusValidUntil?: string | null;
  schedule: Schedule | null;
  accountPlans?: AccountPlan[];
  mzkAvailable?: boolean;
};

/**
 * When Plan Plus is active online, persist entitlement + school snapshot (+ MZK OD prefetch).
 * When access is revoked, clear local offline data.
 */
export function OfflineSync({
  plusAccess,
  plusValidUntil = null,
  schedule,
  accountPlans = [],
  mzkAvailable = false,
}: OfflineSyncProps) {
  const online = useOnlineStatus();

  useEffect(() => {
    if (!plusAccess) {
      void clearOfflinePlusSession();
      return;
    }

    syncOfflineEntitlement({
      plusAccess: true,
      validUntil: plusValidUntil,
    });

    if (!online || !schedule) return;

    warmOfflineShell();

    void saveSchoolOfflineSnapshot({
      schedule,
      accountPlans,
      mzkAvailable,
    }).catch(() => {
      // ignore quota / private mode
    });

    const route = loadMzkRoutePreference();
    if (
      mzkAvailable &&
      hasConfiguredMzkRoute(route) &&
      route.boardStopId &&
      route.alightStopId
    ) {
      void prefetchMzkOdForRoute({
        boardStopId: route.boardStopId,
        alightStopId: route.alightStopId,
        route: route.route,
      });
    }
  }, [
    plusAccess,
    plusValidUntil,
    schedule,
    accountPlans,
    mzkAvailable,
    online,
  ]);

  return null;
}
