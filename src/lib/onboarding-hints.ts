export type OnboardingHintId = "plan" | "mzk";

const STORAGE_KEYS: Record<OnboardingHintId, string> = {
  plan: "school-bus.hint-plan.dismissed.v1",
  mzk: "school-bus.hint-mzk.dismissed.v1",
};

const CHANGE_EVENTS: Record<OnboardingHintId, string> = {
  plan: "school-bus-hint-plan",
  mzk: "school-bus-hint-mzk",
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
    window.dispatchEvent(new Event(CHANGE_EVENTS[id]));
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeHintDismissed(
  id: OnboardingHintId,
  onStoreChange: () => void,
) {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENTS[id], onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENTS[id], onChange);
  };
}

export function getHintDismissedSnapshot(id: OnboardingHintId): boolean {
  return isHintDismissed(id);
}
