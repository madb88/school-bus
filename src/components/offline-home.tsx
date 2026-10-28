"use client";

import { OfflineSync } from "@/components/offline-sync";
import { ScheduleBoard } from "@/components/schedule-board";
import { ScheduleStatusBanner } from "@/components/schedule-status-banner";
import { ScheduleUnavailable } from "@/components/schedule-unavailable";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import type { Schedule } from "@/lib/dowozy/types";
import { offlineConnectivityFreshness } from "@/lib/offline/freshness";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { useSchoolOfflineSnapshot } from "@/lib/offline/use-school-offline-snapshot";
import type { FreshnessInfo } from "@/lib/schedule-freshness";

type OfflineHomeProps = {
  schedule: Schedule | null;
  freshness: FreshnessInfo[];
  mzkAvailable: boolean;
  accountPlans: AccountPlan[];
  plusAccess: boolean;
  plusValidUntil?: string | null;
};

export function OfflineHome({
  schedule,
  freshness,
  mzkAvailable,
  accountPlans,
  plusAccess,
  plusValidUntil = null,
}: OfflineHomeProps) {
  const online = useOnlineStatus();
  const { ready: cacheReady, cached } = useSchoolOfflineSnapshot(schedule);

  const usingCache = !schedule && cached != null;
  const effectiveSchedule = schedule ?? cached?.schedule ?? null;
  const effectivePlans =
    accountPlans.length > 0 ? accountPlans : (cached?.accountPlans ?? []);
  const effectiveMzkAvailable = schedule
    ? mzkAvailable
    : Boolean(cached?.mzkAvailable);
  const showOfflineBanner = !online || usingCache;
  const bannerItems: FreshnessInfo[] = showOfflineBanner
    ? [
        offlineConnectivityFreshness(cached?.cachedAt ?? schedule?.fetchedAt),
        ...freshness,
      ]
    : freshness;

  return (
    <>
      <OfflineSync
        plusAccess={plusAccess}
        plusValidUntil={plusValidUntil}
        schedule={schedule}
        accountPlans={accountPlans}
        mzkAvailable={mzkAvailable}
      />
      {!cacheReady ? (
        <p className="text-sm text-muted-foreground">Wczytywanie rozkładu…</p>
      ) : effectiveSchedule ? (
        <>
          <h1 className="sr-only">Rozkład dowozów</h1>
          <ScheduleStatusBanner
            items={bannerItems}
            className="mb-4 print:hidden md:mb-6"
          />
          <ScheduleBoard
            schedule={effectiveSchedule}
            mzkAvailable={effectiveMzkAvailable}
            accountPlans={effectivePlans}
          />
        </>
      ) : (
        <ScheduleUnavailable />
      )}
    </>
  );
}
