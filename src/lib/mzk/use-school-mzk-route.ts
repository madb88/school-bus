"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BackendMzkRoute } from "@/lib/auth/backend";
import { accountMzkRouteToPreference } from "./account-route";
import type { MzkRoutePreference } from "./route-preference";
import {
  clearMzkRoutePreference,
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
  saveMzkRoutePreference,
} from "./route-storage";
import { useMzkRoutePreference } from "./use-mzk-route";

export type UseSchoolMzkRouteArgs = {
  signedIn: boolean;
  schoolId: string;
  accountRoute: BackendMzkRoute | null;
};

export type UseSchoolMzkRouteResult = {
  route: MzkRoutePreference;
  save: (pref: MzkRoutePreference) => Promise<boolean>;
  clear: () => Promise<boolean>;
  saving: boolean;
};

/**
 * Anonymous: localStorage preference (unchanged).
 * Signed in: account route is source of truth; save/clear go through the BFF
 * and mirror into the same LS key for offline / existing readers.
 */
export function useSchoolMzkRoute({
  signedIn,
  schoolId,
  accountRoute,
}: UseSchoolMzkRouteArgs): UseSchoolMzkRouteResult {
  const local = useMzkRoutePreference();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const accountBoardId = accountRoute?.boardStopId ?? null;
  const accountAlightId = accountRoute?.alightStopId ?? null;
  const accountLine = accountRoute?.route ?? null;
  const accountPref = useMemo(
    () =>
      accountMzkRouteToPreference(
        accountBoardId && accountAlightId
          ? {
              boardStopId: accountBoardId,
              alightStopId: accountAlightId,
              ...(accountLine ? { route: accountLine } : {}),
            }
          : null,
      ),
    [accountBoardId, accountAlightId, accountLine],
  );
  const hasAccountRoute = hasConfiguredMzkRoute(accountPref);

  // Keep LS in sync with the account route so offline mode and transfer still work.
  useEffect(() => {
    if (!signedIn || !hasAccountRoute) return;
    const current = loadMzkRoutePreference();
    if (
      current.boardStopId === accountPref.boardStopId &&
      current.alightStopId === accountPref.alightStopId &&
      current.route === accountPref.route
    ) {
      return;
    }
    saveMzkRoutePreference(accountPref);
  }, [signedIn, hasAccountRoute, accountPref]);

  // Signed in with an account route → account wins; otherwise local (anonymous,
  // or signed in before one-time upload / after clear pending refresh).
  const route = signedIn && hasAccountRoute ? accountPref : local;

  const save = useCallback(
    async (pref: MzkRoutePreference): Promise<boolean> => {
      if (!signedIn) {
        saveMzkRoutePreference(pref);
        return true;
      }
      if (!schoolId.trim() || !hasConfiguredMzkRoute(pref)) return false;
      setSaving(true);
      try {
        const response = await fetch(
          `/api/account/mzk-route?schoolId=${encodeURIComponent(schoolId)}`,
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              boardStopId: pref.boardStopId,
              alightStopId: pref.alightStopId,
              ...(pref.route ? { route: pref.route } : {}),
            }),
          },
        );
        if (!response.ok) return false;
        saveMzkRoutePreference(pref);
        router.refresh();
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [signedIn, schoolId, router],
  );

  const clear = useCallback(async (): Promise<boolean> => {
    if (!signedIn) {
      clearMzkRoutePreference();
      return true;
    }
    if (!schoolId.trim()) return false;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/account/mzk-route?schoolId=${encodeURIComponent(schoolId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) return false;
      clearMzkRoutePreference();
      router.refresh();
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [signedIn, schoolId, router]);

  return { route, save, clear, saving };
}
