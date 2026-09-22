"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { getDayTimes } from "@/lib/child-schedule/match";
import { hasConfiguredLessons } from "@/lib/child-schedule/storage";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import {
  collectPlaces,
  countVisibleTrips,
  filterSchedule,
  type ScheduleDateFilter,
  type ScheduleDirection,
} from "@/lib/dowozy/filter-schedule";
import { resolveTargetDay } from "@/lib/dowozy/schedule-dates";
import type { Schedule, Stop } from "@/lib/dowozy/types";
import { cn } from "cn";

type ScheduleBoardProps = {
  schedule: Schedule;
  initialMatchLessonPlan?: boolean;
};

function formatFetchedAt(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";

    // Fixed shape avoids Node vs browser locale quirks ("o" vs ",").
    return `${get("day")}.${get("month")}.${get("year")}, ${get("hour")}:${get("minute")}`;
  } catch {
    return iso;
  }
}

function PlaceChip({
  place,
  highlight,
  onSelect,
}: {
  place: string;
  highlight: boolean;
  onSelect: (place: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(place)}
      aria-pressed={highlight}
      title={
        highlight
          ? `Wyłącz filtr: ${place}`
          : `Filtruj po miejscu: ${place}`
      }
      className={cn(
        "inline-flex !cursor-pointer items-center rounded-md px-2 py-0.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        highlight
          ? "bg-bus text-bus-foreground font-semibold hover:bg-bus/90"
          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
      )}
      style={{ cursor: "pointer" }}
    >
      {place}
    </button>
  );
}

function StopRow({
  stop,
  activePlace,
  onSelectPlace,
}: {
  stop: Stop;
  activePlace: string | null;
  onSelectPlace: (place: string) => void;
}) {
  return (
    <li className="grid grid-cols-[4.5rem_1fr] gap-3 border-t border-border/50 py-3 first:border-t-0 sm:grid-cols-[5.5rem_1fr] sm:gap-4">
      <time className="font-display text-lg font-bold tabular-nums tracking-tight text-asphalt sm:text-xl">
        {stop.time}
      </time>
      <div className="flex flex-wrap items-center gap-1.5 self-center">
        {stop.places.map((item) => (
          <PlaceChip
            key={item}
            place={item}
            highlight={activePlace !== null && item === activePlace}
            onSelect={onSelectPlace}
          />
        ))}
      </div>
    </li>
  );
}

function SectionHeading({
  id,
  eyebrow,
  title,
}: {
  id: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold tracking-[0.18em] text-bus-deep uppercase">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-1 font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl"
      >
        {title}
      </h2>
    </div>
  );
}

export function ScheduleBoard({
  schedule,
  initialMatchLessonPlan = false,
}: ScheduleBoardProps) {
  const places = collectPlaces(schedule);
  const lessonPlan = useLessonPlan();
  const planReady = hasConfiguredLessons(lessonPlan);

  const [matchLessonPlan, setMatchLessonPlan] = useState(
    initialMatchLessonPlan,
  );
  const [placeOverride, setPlaceOverride] = useState<string | null | undefined>(
    undefined,
  );
  const [direction, setDirection] = useState<ScheduleDirection>("all");
  const [dateFilter, setDateFilter] = useState<ScheduleDateFilter>(
    initialMatchLessonPlan ? "today" : "all",
  );

  const matchActive = matchLessonPlan && planReady;
  const place =
    placeOverride === undefined
      ? matchActive
        ? lessonPlan.place
        : null
      : placeOverride;

  const deferredPlace = useDeferredValue(place);
  const deferredDirection = useDeferredValue(direction);
  const deferredDateFilter = useDeferredValue(dateFilter);
  const deferredMatch = useDeferredValue(matchActive);

  const filtered = filterSchedule(schedule, {
    place: deferredPlace,
    direction: deferredDirection,
    dateFilter: deferredDateFilter,
    lessonPlan,
    matchLessonPlan: deferredMatch,
  });
  const tripCount = countVisibleTrips(filtered);
  const isEmpty = tripCount === 0;

  const target = resolveTargetDay(deferredDateFilter);
  const dayTimes =
    deferredMatch && target
      ? getDayTimes(lessonPlan, target.weekday)
      : undefined;

  function enableMatchPlan() {
    startTransition(() => {
      setMatchLessonPlan(true);
      setPlaceOverride(undefined);
      setDateFilter((current) => (current === "all" ? "today" : current));
    });
  }

  function selectPlace(nextPlace: string) {
    startTransition(() => {
      setPlaceOverride(place === nextPlace ? null : nextPlace);
    });
  }

  return (
    <div className="space-y-10">
      <SiteHeader current="rozklad" />

      <header className="animate-rise-delay space-y-3">
        <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Rozkład dowozów
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {schedule.periodLabel
            ? `Obowiązuje: ${schedule.periodLabel}`
            : schedule.title}
          . Filtruj po dniu, miejscu albo dopasuj kursy do planu lekcji dziecka.
        </p>
        <p className="text-sm text-muted-foreground">
          Zaktualizowano {formatFetchedAt(schedule.fetchedAt)}
          {" · "}
          <a
            href={schedule.sourceUrl}
            className="underline underline-offset-2 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            źródło: szkolaolimpijczykow.pl
          </a>
        </p>
      </header>

      <div className="sticky top-0 z-10 ml-[calc(50%-50vw)] w-screen space-y-4 border-y border-border/50 bg-[color-mix(in_srgb,var(--background)_88%,transparent)] py-4 shadow-[0_8px_30px_-18px_color-mix(in_srgb,var(--foreground)_35%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-6 sm:px-10">
          <div className="flex flex-wrap items-center gap-2">
            {planReady ? (
              <Button
                type="button"
                size="lg"
                variant={matchActive ? "secondary" : "outline"}
                aria-pressed={matchActive}
                onClick={() => {
                  if (matchActive) {
                    startTransition(() => setMatchLessonPlan(false));
                  } else {
                    enableMatchPlan();
                  }
                }}
              >
                Dopasuj do planu
              </Button>
            ) : (
              <Link
                href="/lekcje"
                className="inline-flex h-9 items-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
              >
                Ustaw plan lekcji
              </Link>
            )}
            {matchActive && dayTimes ? (
              <p className="text-sm text-muted-foreground">
                Lekcje{dayTimes.start ? ` od ${dayTimes.start}` : ""}
                {dayTimes.end ? ` do ${dayTimes.end}` : ""}
              </p>
            ) : null}
            {matchActive && target && !dayTimes ? (
              <p className="text-sm text-muted-foreground">
                Brak godzin w planie na ten dzień —{" "}
                <Link
                  href="/lekcje"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  uzupełnij
                </Link>
              </p>
            ) : null}
          </div>

          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Dzień"
          >
            {(
              [
                ["all", "Wszystkie dni"],
                ["today", "Dzisiaj"],
                ["tomorrow", "Jutro"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="lg"
                variant={dateFilter === value ? "secondary" : "outline"}
                aria-pressed={dateFilter === value}
                onClick={() => {
                  startTransition(() => setDateFilter(value));
                }}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Miejsce
              </span>
              <select
                value={place ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => {
                    setPlaceOverride(value === "" ? null : value);
                  });
                }}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Wszystkie miejsca</option>
                {places.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Kierunek"
            >
              {(
                [
                  ["all", "Wszystkie"],
                  ["pickups", "Dowozy"],
                  ["dropoffs", "Odwozy"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="lg"
                  variant={direction === value ? "secondary" : "outline"}
                  aria-pressed={direction === value}
                  onClick={() => {
                    startTransition(() => setDirection(value));
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {place || dateFilter !== "all" || matchActive ? (
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 sm:px-10">
            <p className="text-sm text-muted-foreground">
              {matchActive ? "Plan · " : null}
              {dateFilter === "today"
                ? "Dzisiaj"
                : dateFilter === "tomorrow"
                  ? "Jutro"
                  : "Wszystkie dni"}
              {place ? (
                <>
                  {" · "}
                  <span className="font-medium text-foreground">{place}</span>
                </>
              ) : null}
              {" · "}
              {tripCount}{" "}
              {tripCount === 1
                ? "pozycja"
                : tripCount < 5
                  ? "pozycje"
                  : "pozycji"}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                startTransition(() => {
                  setPlaceOverride(null);
                  setDateFilter("all");
                  setMatchLessonPlan(false);
                });
              }}
            >
              Wyczyść
            </Button>
          </div>
        ) : null}
      </div>

      {isEmpty ? (
        <p className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center text-muted-foreground">
          Brak kursów dla wybranego filtra.
          {matchActive && !dayTimes && target ? (
            <>
              {" "}
              Uzupełnij godziny na{" "}
              <Link
                href="/lekcje"
                className="underline underline-offset-2 hover:text-foreground"
              >
                planie lekcji
              </Link>
              .
            </>
          ) : null}
        </p>
      ) : (
        <div className="animate-rise-delay-2 space-y-14 animate-in fade-in duration-300">
          {filtered.pickups.length > 0 ? (
            <section aria-labelledby="pickups-heading">
              <SectionHeading
                id="pickups-heading"
                eyebrow="Rano / do szkoły"
                title="Dowozy"
              />
              <div className="space-y-8">
                {filtered.pickups.map((block) => (
                  <article
                    key={`${block.kind}-${block.name}`}
                    className="space-y-4"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-display text-xl font-semibold text-asphalt">
                        {block.name}
                      </h3>
                      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {block.kind === "vehicle" ? "pojazd" : "kierowca"}
                      </span>
                    </div>
                    <div className="space-y-5">
                      {block.courses.map((course) => (
                        <div
                          key={`${block.name}-${course.label}-${course.note ?? ""}`}
                          className="rounded-xl border border-border/70 bg-card/90 px-4 py-3 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-5"
                        >
                          <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <p className="font-medium text-foreground">
                              {course.label}
                            </p>
                            {course.note ? (
                              <p className="text-sm text-muted-foreground">
                                {course.note}
                              </p>
                            ) : null}
                          </div>
                          <ul>
                            {course.stops.map((stop, index) => (
                              <StopRow
                                key={`${stop.time}-${stop.places.join("-")}-${index}`}
                                stop={stop}
                                activePlace={deferredPlace}
                                onSelectPlace={selectPlace}
                              />
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {filtered.dropoffsByDate.length > 0 ||
          filtered.dropoffsWeekday.length > 0 ? (
            <section aria-labelledby="dropoffs-heading">
              <SectionHeading
                id="dropoffs-heading"
                eyebrow="Po lekcjach / do domu"
                title="Odwozy"
              />
              <div className="space-y-8">
                {filtered.dropoffsByDate.map((day) => (
                  <article key={day.dateLabel} className="space-y-3">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-asphalt">
                        {day.dateLabel}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {day.driver}
                      </p>
                    </div>
                    <ul className="rounded-xl border border-border/70 bg-card/90 px-4 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-5">
                      {day.runs.map((run, index) => (
                        <StopRow
                          key={`${day.dateLabel}-${run.time}-${index}`}
                          stop={run}
                          activePlace={deferredPlace}
                          onSelectPlace={selectPlace}
                        />
                      ))}
                    </ul>
                  </article>
                ))}

                {filtered.dropoffsWeekday.map((block) => (
                  <article
                    key={`${block.title}-${block.driver}`}
                    className="space-y-3"
                  >
                    <div>
                      <h3 className="font-display text-xl font-semibold text-asphalt">
                        {block.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {block.driver}
                      </p>
                    </div>
                    <ul className="rounded-xl border border-border/70 bg-card/90 px-4 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-5">
                      {block.runs.map((run, index) => (
                        <StopRow
                          key={`${block.driver}-${run.time}-${index}`}
                          stop={run}
                          activePlace={deferredPlace}
                          onSelectPlace={selectPlace}
                        />
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
