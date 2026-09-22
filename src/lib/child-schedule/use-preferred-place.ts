"use client";

import { useSyncExternalStore } from "react";
import {
  getPreferredPlaceSnapshot,
  subscribePreferredPlace,
} from "./preferred-place";

export function usePreferredPlace(): string | null {
  const raw = useSyncExternalStore(
    subscribePreferredPlace,
    getPreferredPlaceSnapshot,
    () => "",
  );
  const trimmed = raw.trim();
  return trimmed || null;
}
