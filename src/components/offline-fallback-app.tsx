"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OfflineHome } from "@/components/offline-home";
import { buttonVariants } from "@/components/ui/button";
import { hasOfflineEntitlement } from "@/lib/offline/entitlement";
import {
  loadSchoolOfflineSnapshot,
  type SchoolOfflineSnapshot,
} from "@/lib/offline/school-cache";
import { cn } from "cn";

type FallbackPhase =
  | { kind: "loading" }
  | { kind: "no-plus" }
  | { kind: "no-data" }
  | { kind: "ready"; cached: SchoolOfflineSnapshot };

/**
 * Shown when the service worker cannot serve a cached route document.
 * Hydrates the school board from IndexedDB for Plan Plus.
 */
export function OfflineFallbackApp() {
  const [phase, setPhase] = useState<FallbackPhase>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!hasOfflineEntitlement()) {
        if (!cancelled) setPhase({ kind: "no-plus" });
        return;
      }
      const snap = await loadSchoolOfflineSnapshot();
      if (cancelled) return;
      if (!snap?.schedule) {
        setPhase({ kind: "no-data" });
        return;
      }
      setPhase({ kind: "ready", cached: snap });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "loading") {
    return (
      <p className="text-sm text-muted-foreground">Wczytywanie trybu offline…</p>
    );
  }

  if (phase.kind === "no-plus") {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-asphalt">
          Brak połączenia z internetem
        </h1>
        <p className="text-muted-foreground">
          Rozkład offline jest dostępny w Planie Plus — po wcześniejszym
          otwarciu aplikacji online. Połącz się z siecią albo odblokuj Plan
          Plus w profilu.
        </p>
        <Link href="/profil" className={cn(buttonVariants(), "inline-flex")}>
          Przejdź do profilu
        </Link>
      </div>
    );
  }

  if (phase.kind === "no-data") {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-asphalt">
          Brak zapisanej kopii rozkładu
        </h1>
        <p className="text-muted-foreground">
          Otwórz aplikację mając internet (z aktywnym Planem Plus), żeby zapisać
          rozkład na tym urządzeniu. Potem będzie dostępny offline.
        </p>
        <Link href="/" className={cn(buttonVariants(), "inline-flex")}>
          Spróbuj ponownie
        </Link>
      </div>
    );
  }

  return (
    <OfflineHome
      schedule={phase.cached.schedule}
      freshness={[]}
      mzkAvailable={phase.cached.mzkAvailable}
      accountPlans={phase.cached.accountPlans}
      plusAccess
      plusValidUntil={null}
      correction={phase.cached.correction ?? null}
    />
  );
}
