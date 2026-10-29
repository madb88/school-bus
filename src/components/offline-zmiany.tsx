"use client";

import { useEffect, useState } from "react";
import { OfflineConnectivityBanner } from "@/components/offline-connectivity-banner";
import { OfflineNoAccessScreen } from "@/components/offline-no-access-screen";
import { ScheduleChangesContent } from "@/components/schedule-changes-content";
import type { ScheduleCorrectionSnapshot } from "@/lib/dowozy/types";
import { hasOfflineEntitlement } from "@/lib/offline/entitlement";
import {
  loadSchoolOfflineSnapshot,
  type SchoolOfflineCorrection,
} from "@/lib/offline/school-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";

type OfflineZmianyProps = {
  correction: ScheduleCorrectionSnapshot | null;
};

function toContentCorrection(
  value: ScheduleCorrectionSnapshot | SchoolOfflineCorrection | null,
): SchoolOfflineCorrection | null {
  if (!value) return null;
  return {
    original: value.original,
    modified: value.modified,
    ...(value.activeUntil && value.modified
      ? { activeUntil: value.activeUntil }
      : {}),
  };
}

export function OfflineZmiany({ correction }: OfflineZmianyProps) {
  const online = useOnlineStatus();
  const [ready, setReady] = useState(() => correction != null);
  const [cachedCorrection, setCachedCorrection] =
    useState<SchoolOfflineCorrection | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hasOfflineEntitlement()) {
        if (!cancelled) setReady(true);
        return;
      }
      const snap = await loadSchoolOfflineSnapshot();
      if (cancelled) return;
      setCachedCorrection(snap?.correction ?? null);
      setCachedAt(snap?.cachedAt ?? null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const usingCache = !correction && cachedCorrection != null;
  const effective = toContentCorrection(correction) ?? cachedCorrection;
  const showOfflineBanner = !online || usingCache;
  const blockOffline = !online && !hasOfflineEntitlement();

  if (blockOffline) {
    return <OfflineNoAccessScreen />;
  }

  return (
    <>
      {showOfflineBanner ? (
        <OfflineConnectivityBanner
          cachedAt={cachedAt ?? correction?.original.fetchedAt}
          className="mb-4 print:hidden md:mb-6"
        />
      ) : null}
      {!ready && !correction ? (
        <p className="text-sm text-muted-foreground">Wczytywanie zmian…</p>
      ) : (
        <ScheduleChangesContent correction={effective} />
      )}
    </>
  );
}
