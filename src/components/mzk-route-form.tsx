"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { StopCombobox } from "@/components/stop-combobox";
import { Button } from "@/components/ui/button";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import { usePreferredPlace } from "@/lib/child-schedule/use-preferred-place";
import { filtersHref } from "@/lib/dowozy/filter-url";
import {
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
  const pref = draft ?? stored;
  const [savedFlash, setSavedFlash] = useState(false);
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
    setDraft((prev) => {
      const base = prev ?? stored;
      const next: MzkRoutePreference = {
        ...base,
        boardStopId,
        alightStopId,
      };
      const routes = routesForOd(schedule, boardStopId, alightStopId);
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
        [field]: value === "" ? null : value,
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
      const routes = routesForOd(
        schedule,
        source.boardStopId,
        source.alightStopId,
      );
      const route =
        source.route && routes.includes(source.route)
          ? source.route
          : routes.length === 1
            ? routes[0]
            : null;

      const normalized: MzkRoutePreference = {
        boardStopId: source.boardStopId,
        alightStopId: source.alightStopId,
        route,
      };
      saveMzkRoutePreference(normalized);
      setDraft(null);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handleClear() {
    clearMzkRoutePreference();
    setDraft({ ...EMPTY_MZK_ROUTE });
    setSavedFlash(false);
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
          <label
            htmlFor="mzk-board-stop"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Wsiadam (do szkoły)
          </label>
          <StopCombobox
            id="mzk-board-stop"
            stops={stopOptions}
            value={pref.boardStopId}
            onChange={(stopId) => setStops("boardStopId", stopId)}
            placeholder="Szukaj przystanku wsiadania…"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="mzk-alight-stop"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Wysiadam (przy szkole)
          </label>
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

      <label className="flex max-w-md flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Numer linii{" "}
          <span className="normal-case tracking-normal text-muted-foreground/80">
            (opcjonalnie)
          </span>
        </span>
        <select
          value={selectedRoute}
          onChange={(event) => setRoute(event.target.value)}
          disabled={
            !pref.boardStopId ||
            !pref.alightStopId ||
            sameStop ||
            availableRoutes.length === 0
          }
          className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        >
          {availableRoutes.length === 0 ? (
            <option value="">Najpierw wybierz przystanki</option>
          ) : availableRoutes.length === 1 ? (
            <option value={availableRoutes[0]}>
              Linia {availableRoutes[0]}
            </option>
          ) : (
            <>
              <option value="">Wszystkie linie na trasie</option>
              {availableRoutes.map((route) => (
                <option key={route} value={route}>
                  Linia {route}
                </option>
              ))}
            </>
          )}
        </select>
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
      </label>

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
        {savedFlash ? (
          <span className="text-sm font-medium text-bus-deep">Zapisano</span>
        ) : null}
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
