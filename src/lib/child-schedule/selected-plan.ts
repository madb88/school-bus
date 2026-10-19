import { isAccountPlanId, type AccountPlan } from "./account-plan";

export const SELECTED_PLAN_STORAGE_KEY = "school-bus.selected-plan.v1";
export const SELECTED_PLAN_EVENT = "school-bus-selected-plan";

function notifySelectedPlan(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SELECTED_PLAN_EVENT));
}

/** Resolve a stored value (UUID or legacy index) against the current plan list. */
export function resolveSelectedPlanId(
  plans: AccountPlan[],
  raw: string | null,
): string | null {
  const withIds = plans.filter((plan): plan is AccountPlan & { id: string } =>
    isAccountPlanId(plan.id),
  );
  if (withIds.length === 0) return null;

  if (raw != null && isAccountPlanId(raw)) {
    if (withIds.some((plan) => plan.id === raw)) return raw;
    return withIds[0]!.id;
  }

  // Legacy: numeric index stored before planId migration.
  if (raw != null) {
    const index = Number.parseInt(raw, 10);
    if (Number.isFinite(index) && index >= 0 && index < withIds.length) {
      return withIds[index]!.id;
    }
  }

  return withIds[0]!.id;
}

export function loadSelectedPlanId(plans: AccountPlan[]): string | null {
  if (typeof window === "undefined") {
    return resolveSelectedPlanId(plans, null);
  }
  try {
    const raw = window.localStorage.getItem(SELECTED_PLAN_STORAGE_KEY);
    const id = resolveSelectedPlanId(plans, raw);
    // Migrate legacy index → UUID when we can.
    if (id && raw !== id) {
      window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return resolveSelectedPlanId(plans, null);
  }
}

export function saveSelectedPlanId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id && isAccountPlanId(id)) {
      window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(SELECTED_PLAN_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
  notifySelectedPlan();
}

/** After a save: keep the same id if still present, else first plan / null. */
export function reconcileSelectedPlanId(
  plans: AccountPlan[],
  preferredId: string | null,
): string | null {
  return resolveSelectedPlanId(plans, preferredId);
}

export function indexOfPlanId(plans: AccountPlan[], id: string | null): number {
  if (!id) return 0;
  const index = plans.findIndex((plan) => plan.id === id);
  return index >= 0 ? index : 0;
}

export function subscribeSelectedPlan(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(SELECTED_PLAN_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SELECTED_PLAN_EVENT, onChange);
  };
}

/** Snapshot string for useSyncExternalStore (empty when none). */
export function getSelectedPlanIdSnapshot(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(SELECTED_PLAN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getSelectedPlanIdServerSnapshot(): string {
  return "";
}
