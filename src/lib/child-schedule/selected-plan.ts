export const SELECTED_PLAN_STORAGE_KEY = "school-bus.selected-plan.v1";

export function loadSelectedPlanIndex(planCount: number): number {
  if (typeof window === "undefined" || planCount < 1) return 0;
  try {
    const raw = window.localStorage.getItem(SELECTED_PLAN_STORAGE_KEY);
    const index = raw == null ? 0 : Number.parseInt(raw, 10);
    if (!Number.isFinite(index) || index < 0 || index >= planCount) return 0;
    return index;
  } catch {
    return 0;
  }
}

export function saveSelectedPlanIndex(index: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_PLAN_STORAGE_KEY, String(Math.max(0, index)));
}
