"use client";

import { ArrowDown, ArrowRight, Bus, ChevronRight, Home, School } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { StopCombobox } from "@/components/stop-combobox";
import { SettingsTransferSheet } from "@/components/settings-transfer-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { hasConfiguredLessons } from "@/lib/child-schedule/storage";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import { usePreferredPlace } from "@/lib/child-schedule/use-preferred-place";
import { filtersHref } from "@/lib/dowozy/filter-url";
import {
  canonicalUniqueStopId,
  findOdDepartures,
  routesForOd,
  uniqueStopsByName,
} from "@/lib/mzk/filter-departures";
import type { MzkSchedule } from "@/lib/mzk/types";
import {
  EMPTY_MZK_ROUTE,
  type MzkRoutePreference,
} from "@/lib/mzk/route-preference";
import { suggestMzkRoutes } from "@/lib/mzk/route-suggestions";
import { mzkNearestPlaceNote } from "@/lib/mzk/place-map";
import {
  clearMzkRoutePreference,
  hasConfiguredMzkRoute,
  saveMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import { useMzkRoutePreference } from "@/lib/mzk/use-mzk-route";

type MzkRouteFormProps = {
  schedule: MzkSchedule;
};

export function MzkRouteForm({ schedule }: MzkRouteFormProps) {
  const stopOptions = uniqueStopsByName(schedule.stops);
  const stored = useMzkRoutePreference();
  const lessonPlan = useLessonPlan();
  const preferredPlace = usePreferredPlace();
  const [draft, setDraft] = useState<MzkRoutePreference | null>(null);
  const rawPref = draft ?? stored;
  const pref: MzkRoutePreference = {
    ...rawPref,
    boardStopId: canonicalUniqueStopId(schedule, rawPref.boardStopId),
    alightStopId: canonicalUniqueStopId(schedule, rawPref.alightStopId),
  };
  const [pending, startTransition] = useTransition();

  const hintPlace = lessonPlan.place ?? preferredPlace;
  const suggestions = suggestMzkRoutes(schedule, hintPlace);
  const nearestNote = mzkNearestPlaceNote(hintPlace);

  const availableRoutes = routesForOd(
    schedule,
    pref.boardStopId,
    pref.alightStopId,
  );

  const boardName = stopOptions.find((s) => s.id === pref.boardStopId)?.name;
  const alightName = stopOptions.find((s) => s.id === pref.alightStopId)?.name;
  const sameStop =
    Boolean(boardName) && Boolean(alightName) && boardName === alightName;

  const selectedRoute =
    availableRoutes.length === 1
      ? availableRoutes[0]
      : pref.route && availableRoutes.includes(pref.route)
        ? pref.route
        : "";

  const weekdayTripCount =
    pref.boardStopId && pref.alightStopId && !sameStop
      ? findOdDepartures(
          schedule,
          pref.boardStopId,
          pref.alightStopId,
          "all",
          new Date(),
          selectedRoute || null,
        ).length
      : null;

  function applySuggestion(boardStopId: string, alightStopId: string) {
    const board = canonicalUniqueStopId(schedule, boardStopId);
    const alight = canonicalUniqueStopId(schedule, alightStopId);
    setDraft((prev) => {
      const base = prev ?? stored;
      const next: MzkRoutePreference = {
        ...base,
        boardStopId: board,
        alightStopId: alight,
      };
      const routes = routesForOd(schedule, board, alight);
      next.route = routes.length === 1 ? routes[0] : null;
      return next;
    });
  }

  function setStops(
    field: "boardStopId" | "alightStopId",
    value: string,
  ) {
    setDraft((prev) => {
      const base = prev ?? stored;
      const next: MzkRoutePreference = {
        ...base,
        [field]:
          value === "" ? null : canonicalUniqueStopId(schedule, value),
      };
      const routes = routesForOd(schedule, next.boardStopId, next.alightStopId);
      if (routes.length === 1) {
        next.route = routes[0];
      } else if (next.route && !routes.includes(next.route)) {
        next.route = null;
      }
      return next;
    });
  }

  function setRoute(value: string) {
    setDraft((prev) => ({
      ...(prev ?? stored),
      route: value === "" ? null : value,
    }));
  }

  function handleSave() {
    startTransition(() => {
      const source = draft ?? stored;
      const boardStopId = canonicalUniqueStopId(schedule, source.boardStopId);
      const alightStopId = canonicalUniqueStopId(schedule, source.alightStopId);
      const routes = routesForOd(schedule, boardStopId, alightStopId);
      const route =
        source.route && routes.includes(source.route)
          ? source.route
          : routes.length === 1
            ? routes[0]
            : null;

      const normalized: MzkRoutePreference = {
        boardStopId,
        alightStopId,
        route,
      };
      saveMzkRoutePreference(normalized);
      setDraft(null);
      toast.success("Trasa MZK zapisana");
    });
  }

  function handleClear() {
    clearMzkRoutePreference();
    setDraft({ ...EMPTY_MZK_ROUTE });
  }

  const routeReady = Boolean(boardName) && Boolean(alightName);

  return (
    <div className="space-y-8">
      {suggestions.length > 0 ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Podpowiedzi dla Twojej lokalizacji
            </h2>
            <p className="text-sm text-muted-foreground">
              Najczęściej wybierane trasy w Twojej okolicy.
            </p>
          </div>
          {nearestNote ? (
            <p className="text-sm text-muted-foreground">{nearestNote}</p>
          ) : null}
          <div className="flex flex-col gap-2">
            {suggestions.map((item) => {
              const active =
                pref.boardStopId === item.boardStopId &&
                pref.alightStopId === item.alightStopId;
              return (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    applySuggestion(item.boardStopId, item.alightStopId)
                  }
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3.5 text-left transition-colors outline-hidden",
                    "border-border/70 hover:border-bus hover:bg-card focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    active &&
                      "border-bus bg-card shadow-[0_0_0_3px_color-mix(in_srgb,var(--bus)_22%,transparent)] hover:border-bus-deep hover:bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card",
                      active
                        ? "border-bus/50 text-bus"
                        : "border-border/70 text-muted-foreground",
                    )}
                  >
                    <Bus aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-snug text-foreground sm:text-base">
                    <span className="break-words">{item.boardName}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="break-words">{item.alightName}</span>
                  </span>
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-bus" : "text-muted-foreground",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label
              htmlFor="mzk-board-stop"
              className="text-base font-semibold text-foreground"
            >
              Z domu
            </Label>
            <p className="text-sm text-muted-foreground">
              Wybierz przystanek, z którego dziecko wsiada.
            </p>
            <StopCombobox
              id="mzk-board-stop"
              stops={stopOptions}
              value={pref.boardStopId}
              onChange={(stopId) => setStops("boardStopId", stopId)}
              placeholder="Szukaj przystanku…"
            />
          </div>

          <div
            className="flex items-center justify-center text-muted-foreground sm:pb-3"
            aria-hidden
          >
            <ArrowDown className="size-4 sm:hidden" />
            <ArrowRight className="hidden size-4 sm:block" />
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label
              htmlFor="mzk-alight-stop"
              className="text-base font-semibold text-foreground"
            >
              Do szkoły
            </Label>
            <p className="text-sm text-muted-foreground">
              Wybierz przystanek przy szkole.
            </p>
            <StopCombobox
              id="mzk-alight-stop"
              stops={stopOptions}
              value={pref.alightStopId}
              onChange={(stopId) => setStops("alightStopId", stopId)}
              placeholder="Szukaj przystanku…"
            />
          </div>
        </div>

        <div className="flex max-w-md flex-col gap-1.5">
          <Label
            htmlFor="mzk-route"
            className="text-base font-semibold text-foreground"
          >
            Numer linii (opcjonalnie)
          </Label>
          <p className="text-sm text-muted-foreground">
            Jeśli znasz numer linii, możesz zawęzić wyniki.
          </p>
          <NativeSelect
            id="mzk-route"
            className="w-full max-w-full [&_select]:h-11 [&_select]:bg-card [&_select]:text-base dark:[&_select]:bg-card"
            value={selectedRoute}
            onChange={(event) => setRoute(event.target.value)}
            disabled={
              !pref.boardStopId ||
              !pref.alightStopId ||
              sameStop ||
              availableRoutes.length === 0
            }
          >
            {availableRoutes.length === 0 ? (
              <NativeSelectOption value="">
                Najpierw wybierz przystanki
              </NativeSelectOption>
            ) : availableRoutes.length === 1 ? (
              <NativeSelectOption value={availableRoutes[0]}>
                Linia {availableRoutes[0]}
              </NativeSelectOption>
            ) : (
              <>
                <NativeSelectOption value="">
                  Wszystkie linie na trasie
                </NativeSelectOption>
                {availableRoutes.map((route) => (
                  <NativeSelectOption key={route} value={route}>
                    Linia {route}
                  </NativeSelectOption>
                ))}
              </>
            )}
          </NativeSelect>
          {availableRoutes.length === 1 ? (
            <span className="text-sm text-muted-foreground">
              Na tej trasie jeździ tylko linia {availableRoutes[0]} — ustawiona
              automatycznie.
            </span>
          ) : availableRoutes.length > 1 ? (
            <span className="text-sm text-muted-foreground">
              Możesz zawęzić do jednej linii albo zostawić wszystkie.
            </span>
          ) : pref.boardStopId && pref.alightStopId && !sameStop ? (
            <span className="text-sm text-muted-foreground">
              Brak bezpośredniego kursu MZK między tymi przystankami.
            </span>
          ) : null}
        </div>

        {weekdayTripCount !== null && !sameStop ? (
          <p className="text-sm text-muted-foreground">
            {weekdayTripCount === 0 ? (
              <>
                Brak bezpośrednich kursów MZK na typowy dzień nauki między tymi
                przystankami.
              </>
            ) : (
              <>
                Na typowy dzień nauki:{" "}
                <span className="font-medium text-foreground">
                  {weekdayTripCount}{" "}
                  {weekdayTripCount === 1
                    ? "kurs"
                    : weekdayTripCount < 5
                      ? "kursy"
                      : "kursów"}
                </span>
                {selectedRoute ? ` (linia ${selectedRoute})` : null}.
              </>
            )}
          </p>
        ) : null}

        {sameStop ? (
          <p className="text-sm text-muted-foreground">
            Przystanek wsiadania i wysiadania musi się różnić.
          </p>
        ) : null}
      </div>

      {routeReady ? (
        <div className="rounded-xl border border-border/70 bg-card px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground">
                <Home aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Z domu</p>
                <p className="break-words font-medium text-foreground">
                  {boardName}
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-center text-muted-foreground"
              aria-hidden
            >
              <ArrowDown className="size-4 sm:hidden" />
              <ArrowRight className="hidden size-4 sm:block" />
            </div>

            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground">
                <School aria-hidden className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Do szkoły</p>
                <p className="break-words font-medium text-foreground">
                  {alightName}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Powrót ze szkoły zostanie ustawiony automatycznie.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          disabled={pending || sameStop}
          onClick={handleSave}
        >
          Zapisz trasę
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={pending}
          onClick={handleClear}
        >
          Wyczyść
        </Button>
        <SettingsTransferSheet
          canTransfer={
            hasConfiguredLessons(lessonPlan) || hasConfiguredMzkRoute(stored)
          }
          triggerLabel="Użyj na innym urządzeniu"
        />
        {hasConfiguredMzkRoute(pref) && !sameStop ? (
          <Link
            href={filtersHref({
              place: null,
              dateFilter: "today",
              direction: "all",
              sourceMode: "school-mzk",
            })}
            className="text-sm font-medium text-asphalt underline underline-offset-2 hover:text-foreground"
          >
            Zobacz rozkład ze Szkolny + MZK
          </Link>
        ) : null}
      </div>
    </div>
  );
}
