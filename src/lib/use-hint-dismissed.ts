"use client";

import { useSyncExternalStore } from "react";
import {
  getHintDismissedSnapshot,
  subscribeHintDismissed,
  type OnboardingHintId,
} from "@/lib/onboarding-hints";

export function useHintDismissed(id: OnboardingHintId): boolean {
  return useSyncExternalStore(
    (onStoreChange) => subscribeHintDismissed(id, onStoreChange),
    () => getHintDismissedSnapshot(id),
    () => false,
  );
}
