"use client";

import { useEffect, useState } from "react";
import { OfflineConnectivityBanner } from "@/components/offline-connectivity-banner";
import { OfflineSync } from "@/components/offline-sync";
import { ScheduleBoard } from "@/components/schedule-board";
import { ScheduleChangesContent } from "@/components/schedule-changes-content";
import {
  OFFLINE_ZMIANY_HASH,
  ScheduleStatusBanner,
} from "@/components/schedule-status-banner";
import { ScheduleUnavailable } from "@/components/schedule-unavailable";
import { buttonVariants } from "@/components/ui/button";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import type { Schedule } from "@/lib/dowozy/types";
import type { SchoolOfflineCorrection } from "@/lib/offline/school-cache";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { useSchoolOfflineSnapshot } from "@/lib/offline/use-school-offline-snapshot";
import type { FreshnessInfo } from "@/lib/schedule-freshness";
import { cn } from "cn";

type OfflineHomeProps = {
  schedule: Schedule | null;
  freshness: FreshnessInfo[];
  mzkAvailable: boolean;
  accountPlans: AccountPlan[];
  plusAccess: boolean;
  plusValidUntil?: string | null;
  correction?: SchoolOfflineCorrection | null;
};

const CORRECTION_BANNER: FreshnessInfo = {
  level: "stale",
  message: "Rozkład zawiera tymczasową korektę.",
  detail:
    "Korekta została wprowadzona na podstawie aktualizacji przekazanej rodzicom. Oficjalna strona dowozów może jeszcze zawierać poprzednią wersję.",
  messageCompact: "Tymczasowa korekta rozkładu",
  detailCompact:
    "Aktualizacja została przekazana rodzicom. Oficjalna strona dowozów może jeszcze zawierać poprzednią wersję.",
  cta: {
    href: "/zmiany-w-rozkladzie",
    label: "Zobacz zmiany",
  },
};

function readZmianyHash(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash === OFFLINE_ZMIANY_HASH;
}

export function OfflineHome({
  schedule,
  freshness,
  mzkAvailable,
  accountPlans,
  plusAccess,
  plusValidUntil = null,
  correction = undefined,
}: OfflineHomeProps) {
  const online = useOnlineStatus();
  const { ready: cacheReady, cached } = useSchoolOfflineSnapshot(schedule);
  const [showZmiany, setShowZmiany] = useState(readZmianyHash);

  useEffect(() => {
    const sync = () => setShowZmiany(readZmianyHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const usingCache = !schedule && cached != null;
  const effectiveSchedule = schedule ?? cached?.schedule ?? null;
  const effectivePlans =
    accountPlans.length > 0 ? accountPlans : (cached?.accountPlans ?? []);
  const effectiveMzkAvailable = schedule
    ? mzkAvailable
    : Boolean(cached?.mzkAvailable);
  const effectiveCorrection = correction ?? cached?.correction ?? null;
  const showOfflineBanner = !online || usingCache;

  const hasZmianyCta = freshness.some(
    (item) => item.cta?.href === "/zmiany-w-rozkladzie",
  );
  const bannerItems =
    !hasZmianyCta && effectiveCorrection?.modified
      ? [...freshness, CORRECTION_BANNER]
      : freshness;

  function closeZmiany() {
    setShowZmiany(false);
    const { pathname, search } = window.location;
    window.history.replaceState(
      window.history.state,
      "",
      `${pathname}${search}`,
    );
  }

  return (
    <>
      <OfflineSync
        plusAccess={plusAccess}
        plusValidUntil={plusValidUntil}
        schedule={schedule}
        accountPlans={accountPlans}
        mzkAvailable={mzkAvailable}
        correction={correction}
      />
      {!cacheReady ? (
        <p className="text-sm text-muted-foreground">Wczytywanie rozkładu…</p>
      ) : showZmiany ? (
        <div className="space-y-6">
          {showOfflineBanner ? (
            <OfflineConnectivityBanner
              cachedAt={cached?.cachedAt ?? schedule?.fetchedAt}
              className="print:hidden"
            />
          ) : null}
          <div className="space-y-3">
            <button
              type="button"
              onClick={closeZmiany}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "w-fit print:hidden",
              )}
            >
              Wróć do rozkładu
            </button>
            <h1 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
              Zmiany w rozkładzie
            </h1>
          </div>
          <ScheduleChangesContent correction={effectiveCorrection} />
        </div>
      ) : effectiveSchedule ? (
        <>
          <h1 className="sr-only">Rozkład dowozów</h1>
          {showOfflineBanner ? (
            <OfflineConnectivityBanner
              cachedAt={cached?.cachedAt ?? schedule?.fetchedAt}
              className="mb-3 print:hidden md:mb-4"
            />
          ) : null}
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
