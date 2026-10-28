"use client";

import { LessonPlanForm } from "@/components/lesson-plan-form";
import { OfflineConnectivityBanner } from "@/components/offline-connectivity-banner";
import { OfflineSync } from "@/components/offline-sync";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import { collectPlaces } from "@/lib/dowozy/filter-schedule";
import { DOWOZY_SOURCE_URL, type Schedule } from "@/lib/dowozy/types";
import type { MzkSchedule } from "@/lib/mzk/types";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import { useSchoolOfflineSnapshot } from "@/lib/offline/use-school-offline-snapshot";

type OfflineLekcjeProps = {
  schedule: Schedule | null;
  mzkSchedule: MzkSchedule | null;
  places: string[];
  mode: "account" | "local";
  initialPlans: AccountPlan[];
  loggedIn: boolean;
  trialEnded: boolean;
  plusAccess: boolean;
  plusValidUntil?: string | null;
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
  plusValidUntil = null,
}: OfflineLekcjeProps) {
  const online = useOnlineStatus();
  const { ready: cacheReady, cached } = useSchoolOfflineSnapshot(schedule);

  const usingCache = !schedule && cached != null;
  const effectiveSchedule = schedule ?? cached?.schedule ?? null;
  const effectivePlaces =
    places.length > 0
      ? places
      : effectiveSchedule
        ? collectPlaces(effectiveSchedule)
        : [];
  const effectivePlans =
    initialPlans.length > 0 ? initialPlans : (cached?.accountPlans ?? []);
  const effectiveMode =
    plusAccess || effectivePlans.length > 0 ? mode : "local";
  const showOfflineBanner = !online || usingCache;

  return (
    <>
      <OfflineSync
        plusAccess={plusAccess}
        plusValidUntil={plusValidUntil}
        schedule={schedule}
        accountPlans={initialPlans}
        mzkAvailable={Boolean(mzkSchedule)}
      />
      {showOfflineBanner ? (
        <OfflineConnectivityBanner
          cachedAt={cached?.cachedAt ?? schedule?.fetchedAt}
          className="mb-4 print:hidden md:mb-6"
        />
      ) : null}
      {!online && effectiveMode === "account" ? (
        <p className="mb-4 text-sm text-muted-foreground print:hidden">
          Edycje planu zapiszą się lokalnie na tym urządzeniu. Synchronizacja z
          kontem będzie możliwa po powrocie połączenia.
        </p>
      ) : null}
      {!cacheReady ? (
        <p className="text-muted-foreground">Wczytywanie planu…</p>
      ) : effectiveSchedule && effectivePlaces.length > 0 ? (
        <LessonPlanForm
          places={effectivePlaces}
          schedule={effectiveSchedule}
          mzkSchedule={online ? mzkSchedule : null}
          mode={online ? effectiveMode : "local"}
          initialPlans={online ? effectivePlans : []}
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
