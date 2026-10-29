"use client";

import { Bus, Moon, Sun } from "lucide-react";
import type { OfflinePersonalizedSchedule as OfflinePersonalizedView } from "@/lib/offline/personalized-schedule";
import { cn } from "cn";

type OfflinePersonalizedScheduleProps = {
  view: OfflinePersonalizedView;
  className?: string;
};

function TripCard({
  time,
  places,
  context,
  direction,
}: {
  time: string;
  places: string;
  context: string;
  direction: "pickup" | "dropoff";
}) {
  const Icon = direction === "pickup" ? Sun : Moon;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border px-3.5 py-3",
        direction === "pickup"
          ? "border-bus/25 bg-bus/[0.07] dark:border-bus/30 dark:bg-bus/[0.09]"
          : "border-indigo-400/20 bg-indigo-500/[0.06] dark:border-bus/25 dark:bg-bus/[0.07]",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-1 size-4 shrink-0",
          direction === "pickup"
            ? "fill-amber-400 text-amber-500"
            : "text-indigo-400 dark:text-bus",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="font-display text-[1.75rem] font-bold leading-none tracking-tight tabular-nums text-asphalt dark:text-foreground">
          {time}
        </p>
        <p className="mt-1.5 truncate text-sm font-medium text-foreground">
          {places}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{context}</p>
      </div>
      <span className="mt-1 shrink-0 rounded-md bg-bus/15 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-bus-deep">
        Szkolny
      </span>
    </div>
  );
}

function BestCard({
  title,
  time,
  label,
  direction,
}: {
  title: string;
  time: string | null;
  label: string | null;
  direction: "pickup" | "dropoff";
}) {
  const Icon = direction === "pickup" ? Sun : Moon;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-2xl border border-border/70 bg-card/80 px-3 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon
          aria-hidden
          className={cn(
            "size-3.5",
            direction === "pickup"
              ? "fill-amber-400 text-amber-500"
              : "text-indigo-400 dark:text-bus",
          )}
        />
        {title}
      </div>
      {time ? (
        <>
          <p className="font-display text-2xl font-bold tabular-nums tracking-tight text-asphalt dark:text-foreground">
            {time}
          </p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Brak dopasowania</p>
      )}
    </div>
  );
}

/**
 * Mobile-first, filter-free offline schedule for one lesson plan / school day.
 */
export function OfflinePersonalizedSchedule({
  view,
  className,
}: OfflinePersonalizedScheduleProps) {
  return (
    <div className={cn("mx-auto w-full max-w-lg space-y-6", className)}>
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Twój rozkład
        </p>
        <h1 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
          {view.dayLabel}
        </h1>
        {view.showingNextSchoolDay ? (
          <p className="text-sm text-muted-foreground">
            Dziś nie ma kursów szkolnych — pokazujemy najbliższy dzień nauki.
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Plan: <span className="font-medium text-foreground">{view.planLabel}</span>
          {" · "}
          {view.place}
        </p>
        {view.lessonStart || view.lessonEnd ? (
          <p className="text-sm text-muted-foreground">
            Lekcje
            {view.lessonStart ? ` od ${view.lessonStart}` : ""}
            {view.lessonEnd ? ` do ${view.lessonEnd}` : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Brak godzin lekcji na ten dzień w zapisanym planie.
          </p>
        )}
      </header>

      <section className="space-y-2" aria-label="Najlepsze połączenie">
        <div className="flex items-center gap-2">
          <Bus aria-hidden className="size-4 text-bus" />
          <h2 className="text-sm font-semibold text-foreground">
            Najlepsze połączenie
          </h2>
        </div>
        <div className="flex gap-2">
          <BestCard
            title="Do szkoły"
            direction="pickup"
            time={view.best?.pickup?.time ?? null}
            label={view.best?.pickup?.label ?? null}
          />
          <BestCard
            title="Do domu"
            direction="dropoff"
            time={view.best?.dropoff?.time ?? null}
            label={view.best?.dropoff?.label ?? null}
          />
        </div>
      </section>

      <section className="space-y-2" aria-label="Dowozy">
        <h2 className="text-sm font-semibold text-foreground">Dowozy</h2>
        {view.pickups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-3.5 py-4 text-sm text-muted-foreground">
            Brak pasujących dowozów na ten dzień.
          </p>
        ) : (
          <div className="space-y-2">
            {view.pickups.map((trip) => (
              <TripCard
                key={`p-${trip.time}-${trip.places}-${trip.context}`}
                {...trip}
                direction="pickup"
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2" aria-label="Odwozy">
        <h2 className="text-sm font-semibold text-foreground">Odwozy</h2>
        {view.dropoffs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border/70 px-3.5 py-4 text-sm text-muted-foreground">
            Brak pasujących odwozów na ten dzień.
          </p>
        ) : (
          <div className="space-y-2">
            {view.dropoffs.map((trip) => (
              <TripCard
                key={`d-${trip.time}-${trip.places}-${trip.context}`}
                {...trip}
                direction="dropoff"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
