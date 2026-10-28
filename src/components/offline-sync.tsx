"use client";

import { useEffect } from "react";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import type { Schedule } from "@/lib/dowozy/types";
import {
  clearOfflinePlusSession,
  persistOfflinePlusSession,
} from "@/lib/offline/clear-session";
import type { SchoolOfflineCorrection } from "@/lib/offline/school-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";

type OfflineSyncProps = {
  plusAccess: boolean;
  plusValidUntil?: string | null;
  schedule: Schedule | null;
  accountPlans?: AccountPlan[];
  mzkAvailable?: boolean;
  correction?: SchoolOfflineCorrection | null;
};

/**
 * When Plan Plus is active online, persist entitlement + school snapshot (+ MZK OD prefetch).
 * When access is revoked, clear local offline data (race-safe vs a later re-login).
 */
export function OfflineSync({
  plusAccess,
  plusValidUntil = null,
  schedule,
  accountPlans = [],
  mzkAvailable = false,
  correction = undefined,
}: OfflineSyncProps) {
  const online = useOnlineStatus();

  useEffect(() => {
    if (!plusAccess) {
      void clearOfflinePlusSession();
      return;
    }

    void persistOfflinePlusSession({
      validUntil: plusValidUntil,
      schedule,
      accountPlans,
      mzkAvailable,
      correction,
      online,
    });
  }, [
    plusAccess,
    plusValidUntil,
    schedule,
    accountPlans,
    mzkAvailable,
    correction,
    online,
  ]);

  return null;
}
