"use client";

import { useEffect, useState } from "react";
import type { Schedule } from "@/lib/dowozy/types";
import { hasOfflineEntitlement } from "./entitlement";
import {
  loadSchoolOfflineSnapshot,
  type SchoolOfflineSnapshot,
} from "./school-cache";

type OfflineSnapshotState = {
  ready: boolean;
  cached: SchoolOfflineSnapshot | null;
};

/**
 * When SSR/live `schedule` is missing, load the Plus IndexedDB snapshot (async).
 */
export function useSchoolOfflineSnapshot(
  schedule: Schedule | null,
): OfflineSnapshotState {
  const [state, setState] = useState<OfflineSnapshotState>(() =>
    schedule ? { ready: true, cached: null } : { ready: false, cached: null },
  );

  useEffect(() => {
    if (schedule) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const cached = hasOfflineEntitlement()
        ? await loadSchoolOfflineSnapshot()
        : null;
      if (cancelled) return;
      setState({ ready: true, cached });
    })();

    return () => {
      cancelled = true;
    };
  }, [schedule]);

  if (schedule) {
    return { ready: true, cached: null };
  }
  return state;
}
