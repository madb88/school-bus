export type OnboardingHintId = "plan" | "mzk";

const STORAGE_KEYS: Record<OnboardingHintId, string> = {
  plan: "school-bus.hint-plan.dismissed.v1",
  mzk: "school-bus.hint-mzk.dismissed.v1",
};

export function isHintDismissed(id: OnboardingHintId): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(STORAGE_KEYS[id]) === "1";
  } catch {
    return false;
  }
}

export function dismissHint(id: OnboardingHintId): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEYS[id], "1");
  } catch {
    // ignore quota / private mode
  }
}
