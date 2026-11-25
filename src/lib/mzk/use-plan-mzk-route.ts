"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildPlanChoices,
  type PlanChoice,
} from "@/lib/child-schedule/active-plan";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import {
  EMPTY_MZK_ROUTE,
  type MzkRoutePreference,
} from "./route-preference";
import {
  clearMzkRoutePreference,
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
  saveMzkRoutePreference,
} from "./route-storage";
import { useMzkRoutePreference } from "./use-mzk-route";

/** Plans to pick from: the account's, else the guest's device plan. */
export function usePlanChoices(accountPlans: AccountPlan[]): PlanChoice[] {
  // The storage hooks parse a fresh object every render; key on the content so
  // the choices (and the routes inside them) stay referentially stable.
  const localPlanKey = JSON.stringify(useLessonPlan());
  const localRouteKey = JSON.stringify(useMzkRoutePreference());
  return useMemo(
    () =>
      buildPlanChoices(
        accountPlans,
        JSON.parse(localPlanKey),
        JSON.parse(localRouteKey),
      ),
    [accountPlans, localPlanKey, localRouteKey],
  );
}

export type UsePlanMzkRouteResult = {
  route: MzkRoutePreference;
  save: (pref: MzkRoutePreference) => Promise<boolean>;
  clear: () => Promise<boolean>;
  saving: boolean;
};

function sameRoute(a: MzkRoutePreference, b: MzkRoutePreference): boolean {
  return (
    a.boardStopId === b.boardStopId &&
    a.alightStopId === b.alightStopId &&
    a.route === b.route &&
    (a.schoolId ?? null) === (b.schoolId ?? null)
  );
}

/**
 * The MZK route of the chosen plan. An account plan saves through the BFF
 * (`/api/account/plans/{id}/mzk-route`) and is mirrored into the device key for
 * offline mode; the guest's device plan keeps it in localStorage, tagged with
 * the plan's school. No plan → no route.
 */
export function usePlanMzkRoute(
  choice: PlanChoice | null,
): UsePlanMzkRouteResult {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const route = choice?.mzkRoute ?? EMPTY_MZK_ROUTE;
  const accountPlanId = choice?.account?.id ?? null;
  const schoolId = choice?.schoolId ?? null;

  // Keep the device key in sync with the active account plan's route so
  // offline mode and settings transfer still see it.
  useEffect(() => {
    if (!accountPlanId || !schoolId || !hasConfiguredMzkRoute(route)) return;
    const next = { ...route, schoolId };
    if (sameRoute(loadMzkRoutePreference(), next)) return;
    saveMzkRoutePreference(next);
  }, [accountPlanId, schoolId, route]);

  const save = useCallback(
    async (pref: MzkRoutePreference): Promise<boolean> => {
      if (!schoolId || !hasConfiguredMzkRoute(pref)) return false;
      const tagged = { ...pref, schoolId };
      if (!accountPlanId) {
        saveMzkRoutePreference(tagged);
        return true;
      }
      setSaving(true);
      try {
        const response = await fetch(
          `/api/account/plans/${encodeURIComponent(accountPlanId)}/mzk-route`,
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
        saveMzkRoutePreference(tagged);
        router.refresh();
        return true;
      } catch {
        return false;
      } finally {
        setSaving(false);
      }
    },
    [accountPlanId, schoolId, router],
  );

  const clear = useCallback(async (): Promise<boolean> => {
    if (!schoolId) return false;
    if (!accountPlanId) {
      clearMzkRoutePreference();
      return true;
    }
    setSaving(true);
    try {
      const response = await fetch(
        `/api/account/plans/${encodeURIComponent(accountPlanId)}/mzk-route`,
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
  }, [accountPlanId, schoolId, router]);

  return { route, save, clear, saving };
}
