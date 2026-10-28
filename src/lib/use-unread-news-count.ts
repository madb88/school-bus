"use client";

import { useSyncExternalStore } from "react";
import {
  getUnreadNewsCountSnapshot,
  subscribeNewsSeen,
} from "@/lib/news-seen";

/** SSR / first paint: 0 — avoids flashing a badge for users who already read news. */
export function useUnreadNewsCount(): number {
  return useSyncExternalStore(
    subscribeNewsSeen,
    getUnreadNewsCountSnapshot,
    () => 0,
  );
}
