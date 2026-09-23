"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StopCombobox } from "@/components/stop-combobox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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

  return (
    <div className="space-y-8">
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Sugestie
            {hintPlace ? (
              <span className="normal-case tracking-normal text-muted-foreground/80">
                {" "}
                z miejsca „{hintPlace}”
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => {
              const active =
                pref.boardStopId === item.boardStopId &&
                pref.alightStopId === item.alightStopId;
              return (
                <Button
                  key={item.label}
                  type="button"
                  size="sm"
                  variant={active ? "secondary" : "outline"}
                  aria-pressed={active}
                  onClick={() =>
                    applySuggestion(item.boardStopId, item.alightStopId)
                  }
                >
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="mzk-board-stop"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Wsiadam (do szkoły)
          </Label>
          <StopCombobox
            id="mzk-board-stop"
            stops={stopOptions}
            value={pref.boardStopId}
            onChange={(stopId) => setStops("boardStopId", stopId)}
            placeholder="Szukaj przystanku wsiadania…"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="mzk-alight-stop"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Wysiadam (przy szkole)
          </Label>
          <StopCombobox
            id="mzk-alight-stop"
            stops={stopOptions}
            value={pref.alightStopId}
            onChange={(stopId) => setStops("alightStopId", stopId)}
            placeholder="Szukaj przystanku wysiadania…"
          />
        </div>
      </div>

      {weekdayTripCount !== null && !sameStop ? (
        <p className="text-sm text-muted-foreground">
          {weekdayTripCount === 0 ? (
            <>Brak bezpośrednich kursów MZK na typowy dzień nauki między tymi przystankami.</>
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

      <div className="flex max-w-md flex-col gap-1.5">
        <Label
          htmlFor="mzk-route"
          className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Numer linii{" "}
          <span className="normal-case tracking-normal text-muted-foreground/80">
            (opcjonalnie)
          </span>
        </Label>
        <NativeSelect
          id="mzk-route"
          className="w-full max-w-full [&_select]:h-11 [&_select]:text-base"
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

      {sameStop ? (
        <p className="text-sm text-muted-foreground">
          Przystanek wsiadania i wysiadania musi się różnić.
        </p>
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
