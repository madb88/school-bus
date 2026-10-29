"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LessonPlanForm } from "@/components/lesson-plan-form";
import { OfflineSync } from "@/components/offline-sync";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import { collectPlaces } from "@/lib/dowozy/filter-schedule";
import { DOWOZY_SOURCE_URL, type Schedule } from "@/lib/dowozy/types";
import type { MzkSchedule } from "@/lib/mzk/types";
import { hasOfflineEntitlement } from "@/lib/offline/entitlement";
import { goToStaticOfflineGate } from "@/lib/offline/static-offline-gate";
import { useOnlineStatus } from "@/lib/offline/use-online-status";

type OfflineLekcjeProps = {
  schedule: Schedule | null;
  mzkSchedule: MzkSchedule | null;
  places: string[];
  mode: "account" | "local";
  initialPlans: AccountPlan[];
  loggedIn: boolean;
  trialEnded: boolean;
  /** Account UI / lesson mode (may include expired Plus with leftover plans). */
  plusAccess: boolean;
  /** True Plus (admin/active/trial) — drives offline entitlement sync. */
  offlinePlusAccess: boolean;
  plusValidUntil?: string | null;
  /** Auth blip: keep local Plus data until /users/me succeeds again. */
  suspendOfflineSync?: boolean;
};

export function OfflineLekcje({
  schedule,
  mzkSchedule,
  places,
  mode,
  initialPlans,
  loggedIn,
  trialEnded,
  plusAccess,
  offlinePlusAccess,
  plusValidUntil = null,
  suspendOfflineSync = false,
}: OfflineLekcjeProps) {
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

  const effectivePlaces =
    places.length > 0
      ? places
      : schedule
        ? collectPlaces(schedule)
        : [];
  const effectiveMode =
    plusAccess || initialPlans.length > 0 ? mode : "local";

  return (
    <>
      <OfflineSync
        plusAccess={offlinePlusAccess}
        plusValidUntil={plusValidUntil}
        schedule={schedule}
        accountPlans={initialPlans}
        mzkAvailable={Boolean(mzkSchedule)}
        suspend={suspendOfflineSync}
      />
      {!online ? (
        <p className="text-muted-foreground">
          {entitled ? "Przechodzę do rozkładu offline…" : "Przekierowanie…"}
        </p>
      ) : schedule && effectivePlaces.length > 0 ? (
        <LessonPlanForm
          places={effectivePlaces}
          schedule={schedule}
          mzkSchedule={mzkSchedule}
          mode={effectiveMode}
          initialPlans={initialPlans}
          loggedIn={loggedIn}
          trialEnded={trialEnded}
        />
      ) : (
        <p className="text-muted-foreground">
          Lista miejsc jest chwilowo niedostępna — rozkład szkolny nie
          załadował się. Spróbuj ponownie później albo zajrzyj na stronę{" "}
          <a
            href={DOWOZY_SOURCE_URL}
            className="underline underline-offset-2 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            szkoły
          </a>
          .
        </p>
      )}
    </>
  );
}
