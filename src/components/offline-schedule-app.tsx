"use client";

import { useEffect, useState } from "react";
import { OfflinePersonalizedSchedule } from "@/components/offline-personalized-schedule";
import { Button } from "@/components/ui/button";
import { loadSelectedPlanId } from "@/lib/child-schedule/selected-plan";
import { parseLessonPlan } from "@/lib/child-schedule/storage";
import { LESSON_PLAN_STORAGE_KEY } from "@/lib/child-schedule/types";
import {
  loadLessonMatchWindow,
  loadLessonMatchWindowEnabled,
} from "@/lib/child-schedule/match-window";
import { hasOfflineEntitlement } from "@/lib/offline/entitlement";
import {
  buildOfflinePersonalizedSchedule,
  type OfflinePersonalizedSchedule as OfflinePersonalizedView,
} from "@/lib/offline/personalized-schedule";
import {
  loadSchoolOfflineSnapshot,
  type SchoolOfflineSnapshot,
} from "@/lib/offline/school-cache";
import { goToStaticOfflineGate } from "@/lib/offline/static-offline-gate";
import { RefreshCw, WifiOff } from "lucide-react";

type Phase =
  | { kind: "loading" }
  | { kind: "no-data" }
  | { kind: "no-plan" }
  | {
      kind: "ready";
      cached: SchoolOfflineSnapshot;
      view: OfflinePersonalizedView;
    };

function readLocalPlan() {
  try {
    const raw = window.localStorage.getItem(LESSON_PLAN_STORAGE_KEY);
    return parseLessonPlan(raw ? JSON.parse(raw) : null);
  } catch {
    return parseLessonPlan(null);
  }
}

/**
 * Sole Plan Plus offline experience: personalized schedule, no app chrome/filters.
 */
export function OfflineScheduleApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hasOfflineEntitlement()) {
        goToStaticOfflineGate();
        return;
      }
      const snap = await loadSchoolOfflineSnapshot();
      if (cancelled) return;
      if (!snap?.schedule) {
        setPhase({ kind: "no-data" });
        return;
      }

      const result = buildOfflinePersonalizedSchedule({
        schedule: snap.schedule,
        accountPlans: snap.accountPlans,
        selectedPlanId: loadSelectedPlanId(snap.accountPlans),
        localPlan: readLocalPlan(),
        windowMin: loadLessonMatchWindow(),
        windowEnabled: loadLessonMatchWindowEnabled(),
      });

      if (!result.ok) {
        setPhase({ kind: "no-plan" });
        return;
      }

      setPhase({ kind: "ready", cached: snap, view: result.view });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "loading") {
    return (
      <p className="px-6 py-16 text-center text-sm text-muted-foreground">
        Wczytywanie rozkładu offline…
      </p>
    );
  }

  if (phase.kind === "no-data" || phase.kind === "no-plan") {
    return (
      <div className="mx-auto flex min-h-[70dvh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-asphalt">
          {phase.kind === "no-plan"
            ? "Brak zapisanego planu lekcji"
            : "Brak zapisanej kopii rozkładu"}
        </h1>
        <p className="text-muted-foreground">
          {phase.kind === "no-plan"
            ? "Otwórz aplikację online z aktywnym Planem Plus i zapisz plan lekcji — wtedy offline zobaczysz swój rozkład."
            : "Otwórz aplikację mając internet (Plan Plus), żeby zapisać rozkład na tym urządzeniu."}
        </p>
        <Button type="button" onClick={() => window.location.reload()}>
          Odśwież
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <div
        role="status"
        className="mb-5 flex items-start gap-3 rounded-2xl border-2 border-red-500/45 bg-red-500/12 px-3.5 py-3 text-red-950 dark:border-red-400/35 dark:bg-red-500/18 dark:text-red-50"
      >
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white dark:bg-red-500">
          <WifiOff aria-hidden className="size-4" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-snug">
            Jesteś offline — masz dostęp tylko do swojego rozkładu jazdy.
          </p>
          <p className="text-xs leading-snug opacity-90">
            Połącz się z internetem, żeby wrócić do pełnej aplikacji
            {(() => {
              const when = phase.cached.cachedAt
                ? formatCachedAt(phase.cached.cachedAt)
                : null;
              return when ? ` · kopia z ${when}` : "";
            })()}
            .
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-display text-sm font-bold tracking-tight">
          <span className="text-asphalt">autobus</span>
          <span className="text-bus">szkolny.pl</span>
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => {
            window.location.reload();
          }}
        >
          <RefreshCw aria-hidden className="size-3.5" />
          Odśwież
        </Button>
      </div>

      <OfflinePersonalizedSchedule view={phase.view} />
    </div>
  );
}

function formatCachedAt(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Warsaw",
    }).format(date);
  } catch {
    return null;
  }
}
