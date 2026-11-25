import {
  accountPlanLabel,
  fromAccountPlan,
  isAccountPlanId,
  type AccountMzkRoute,
  type AccountPlan,
} from "./account-plan";
import { hasConfiguredLessons } from "./storage";
import type { ChildLessonPlan } from "./types";
import {
  EMPTY_MZK_ROUTE,
  type MzkRoutePreference,
} from "@/lib/mzk/route-preference";
import { mzkRouteForSchool } from "@/lib/mzk/route-storage";
import { DEFAULT_SCHOOL_ID } from "@/lib/schools/constants";
import { parseSchoolEntityId } from "@/lib/schools/storage";

/** Key of the guest's single device plan (account plans use their UUID). */
export const LOCAL_PLAN_KEY = "local";

/** A plan the user can pick on `/` and `/mzk`: its school, hours and MZK route. */
export type PlanChoice = {
  /** Account plan UUID, or LOCAL_PLAN_KEY for the device plan. */
  key: string;
  label: string;
  schoolId: string;
  /** Hours + place in the device shape used for matching. */
  plan: ChildLessonPlan;
  /** The account plan, null for the device plan. */
  account: AccountPlan | null;
  /** The plan's MZK route (empty route when none). */
  mzkRoute: MzkRoutePreference;
};

export function accountMzkRouteToPreference(
  route: AccountMzkRoute | null | undefined,
  schoolId?: string,
): MzkRoutePreference {
  if (!route) return { ...EMPTY_MZK_ROUTE };
  return {
    boardStopId: route.boardStopId,
    alightStopId: route.alightStopId,
    route: route.route ?? null,
    ...(schoolId ? { schoolId } : {}),
  };
}

/**
 * Account plans when the user has any (each with its own school and route);
 * otherwise the device plan (guest: one plan, one school, one route).
 */
export function buildPlanChoices(
  accountPlans: AccountPlan[],
  localPlan: ChildLessonPlan,
  localRoute: MzkRoutePreference,
): PlanChoice[] {
  const withIds = accountPlans.filter(
    (plan): plan is AccountPlan & { id: string } => isAccountPlanId(plan.id),
  );
  if (withIds.length > 0) {
    return withIds.map((plan, index) => ({
      key: plan.id,
      label: accountPlanLabel(plan, index),
      schoolId: plan.schoolId,
      plan: fromAccountPlan(plan),
      account: plan,
      mzkRoute: accountMzkRouteToPreference(plan.mzkRoute, plan.schoolId),
    }));
  }
  if (!hasConfiguredLessons(localPlan)) return [];
  const schoolId = parseSchoolEntityId(localPlan.schoolId) ?? DEFAULT_SCHOOL_ID;
  return [
    {
      key: LOCAL_PLAN_KEY,
      label: localPlan.place?.trim() || "Mój plan",
      schoolId,
      plan: { ...localPlan, schoolId },
      account: null,
      mzkRoute: mzkRouteForSchool(localRoute, schoolId),
    },
  ];
}

/** What the URL says about the plan (see `parseFilterParams`). */
export type PlanUrlChoice =
  | { kind: "off" }
  | { kind: "plan"; key: string }
  /** Legacy `plan=<index>` links. */
  | { kind: "index"; index: number }
  | { kind: "default" };

/**
 * Active plan key: the URL's plan → the remembered plan → the first plan.
 * `null` when the URL turns the plan off or there is nothing to pick.
 */
export function resolveActivePlanKey(
  choices: PlanChoice[],
  url: PlanUrlChoice,
  storedKey: string | null,
): string | null {
  if (choices.length === 0 || url.kind === "off") return null;
  if (url.kind === "plan" && choices.some((choice) => choice.key === url.key)) {
    return url.key;
  }
  if (url.kind === "index" && choices[url.index]) {
    return choices[url.index]!.key;
  }
  if (storedKey && choices.some((choice) => choice.key === storedKey)) {
    return storedKey;
  }
  return choices[0]!.key;
}

export function findPlanChoice(
  choices: PlanChoice[],
  key: string | null,
): PlanChoice | null {
  if (!key) return null;
  return choices.find((choice) => choice.key === key) ?? null;
}
