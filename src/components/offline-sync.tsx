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
import type { PublicNotice } from "@/lib/schools/types";

const EMPTY_NOTICES: PublicNotice[] = [];

type OfflineSyncProps = {
  plusAccess: boolean;
  plusValidUntil?: string | null;
  schedule: Schedule | null;
  accountPlans?: AccountPlan[];
  mzkAvailable?: boolean;
  correction?: SchoolOfflineCorrection | null;
  schoolId?: string | null;
  notices?: PublicNotice[];
  /**
   * Session cookie present but /users/me failed — do not clear or renew
   * offline Plus data based on a transient auth blip.
   */
  suspend?: boolean;
};

/**
 * When Plan Plus is active online, persist entitlement + school snapshot for `/offline`.
 * When access is revoked, clear local offline data (race-safe vs a later re-login).
 */
export function OfflineSync({
  plusAccess,
  plusValidUntil = null,
  schedule,
  accountPlans = [],
  mzkAvailable = false,
  correction = undefined,
  schoolId = null,
  notices = EMPTY_NOTICES,
  suspend = false,
}: OfflineSyncProps) {
  const online = useOnlineStatus();

  useEffect(() => {
    if (suspend) return;

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
      schoolId,
      notices,
      online,
    });
  }, [
    suspend,
    plusAccess,
    plusValidUntil,
    schedule,
    accountPlans,
    mzkAvailable,
    correction,
    schoolId,
    notices,
    online,
  ]);

  return null;
}
