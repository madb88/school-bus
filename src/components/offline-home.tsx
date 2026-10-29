"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OfflineSync } from "@/components/offline-sync";
import { ScheduleBoard } from "@/components/schedule-board";
import { ScheduleStatusBanner } from "@/components/schedule-status-banner";
import { ScheduleUnavailable } from "@/components/schedule-unavailable";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import type { Schedule } from "@/lib/dowozy/types";
import { hasOfflineEntitlement } from "@/lib/offline/entitlement";
import type { SchoolOfflineCorrection } from "@/lib/offline/school-cache";
import { goToStaticOfflineGate } from "@/lib/offline/static-offline-gate";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import type { FreshnessInfo } from "@/lib/schedule-freshness";

type OfflineHomeProps = {
  schedule: Schedule | null;
  freshness: FreshnessInfo[];
  mzkAvailable: boolean;
  accountPlans: AccountPlan[];
  /** True Plus (admin/active/trial) — drives offline entitlement sync. */
  offlinePlusAccess: boolean;
  plusValidUntil?: string | null;
  correction?: SchoolOfflineCorrection | null;
  /** Auth blip: keep local Plus data until /users/me succeeds again. */
  suspendOfflineSync?: boolean;
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

export function OfflineHome({
  schedule,
  freshness,
  mzkAvailable,
  accountPlans,
  offlinePlusAccess,
  plusValidUntil = null,
  correction = undefined,
  suspendOfflineSync = false,
}: OfflineHomeProps) {
  const online = useOnlineStatus();
  const router = useRouter();
  const entitled = hasOfflineEntitlement();

  useEffect(() => {
    if (!online && entitled) {
      router.replace("/offline");
      return;
    }
    if (!online && !entitled) {
      goToStaticOfflineGate();
    }
  }, [online, entitled, router]);

  if (!online) {
    return (
      <>
        <OfflineSync
          plusAccess={offlinePlusAccess}
          plusValidUntil={plusValidUntil}
          schedule={schedule}
          accountPlans={accountPlans}
          mzkAvailable={mzkAvailable}
          correction={correction}
          suspend={suspendOfflineSync}
        />
        <p className="text-sm text-muted-foreground">
          {entitled
            ? "Przechodzę do rozkładu offline…"
            : "Przekierowanie…"}
        </p>
      </>
    );
  }

  const hasZmianyCta = freshness.some(
    (item) => item.cta?.href === "/zmiany-w-rozkladzie",
  );
  const bannerItems =
    !hasZmianyCta && correction?.modified
      ? [...freshness, CORRECTION_BANNER]
      : freshness;

  return (
    <>
      <OfflineSync
        plusAccess={offlinePlusAccess}
        plusValidUntil={plusValidUntil}
        schedule={schedule}
        accountPlans={accountPlans}
        mzkAvailable={mzkAvailable}
        correction={correction}
        suspend={suspendOfflineSync}
      />
      {schedule ? (
        <>
          <h1 className="sr-only">Rozkład dowozów</h1>
          <ScheduleStatusBanner
            items={bannerItems}
            className="mb-4 print:hidden md:mb-6"
          />
          <ScheduleBoard
            schedule={schedule}
            mzkAvailable={mzkAvailable}
            accountPlans={accountPlans}
          />
        </>
      ) : (
        <ScheduleUnavailable />
      )}
    </>
  );
}
