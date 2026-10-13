"use client";

import { ChevronDown, Moon, Sparkles, Sun } from "lucide-react";
import { useId, useState } from "react";
import type {
  BestTodayRecommendation,
  BestTodayTrip,
} from "@/lib/dowozy/best-today";
import type { ScheduleSourceMode } from "@/lib/dowozy/filter-url";
import { cn } from "cn";

type BestTodayWidgetProps = {
  recommendation: BestTodayRecommendation;
  sourceMode: ScheduleSourceMode;
  onSourceModeChange: (mode: ScheduleSourceMode) => void;
};

function scrollToTrip(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function tripKindLabel(trip: BestTodayTrip): string {
  if (trip.source === "mzk") {
    return trip.route ? `MZK ${trip.route}` : "MZK";
  }
  return "Szkolny";
}

function DirectionIcon({ direction }: { direction: "pickup" | "dropoff" }) {
  if (direction === "pickup") {
    return (
      <Sun
        className="size-3 shrink-0 fill-amber-400 text-amber-500 dark:fill-amber-400/45 dark:text-amber-400/70"
        aria-hidden
      />
    );
  }
  return (
    <Moon
      className="size-3 shrink-0 text-indigo-400 dark:text-bus"
      aria-hidden
    />
  );
}

function TripItem({
  title,
  direction,
  trip,
}: {
  title: string;
  direction: "pickup" | "dropoff";
  trip: BestTodayTrip | null;
}) {
  if (!trip) {
    return (
      <div className="flex min-w-0 items-center gap-2 py-0.5">
        <DirectionIcon direction={direction} />
        <span className="w-[4.75rem] shrink-0 text-[0.65rem] leading-none text-muted-foreground">
          {title}
        </span>
        <span className="text-sm text-muted-foreground">Brak</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="flex w-full min-w-0 items-center gap-2 py-0.5 text-left outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-bus/40"
      onClick={() => scrollToTrip(trip.id)}
    >
      <DirectionIcon direction={direction} />
      <span className="w-[4.75rem] shrink-0 text-[0.65rem] leading-none text-muted-foreground">
        {title}
      </span>
      <span className="shrink-0 font-display text-[1.35rem] font-bold leading-none tracking-tight text-asphalt tabular-nums dark:text-foreground">
        {trip.time}
      </span>
      <span
        className={cn(
          "shrink-0 text-[0.65rem] font-semibold tracking-wide uppercase",
          trip.source === "mzk" ? "text-mzk-deep/80" : "text-bus-deep/80",
        )}
      >
        {tripKindLabel(trip)}
      </span>
      <span className="min-w-0 truncate text-[0.65rem] text-muted-foreground/80">
        {trip.label}
      </span>
    </button>
  );
}

function SourcePills({
  sourceMode,
  onSourceModeChange,
}: {
  sourceMode: ScheduleSourceMode;
  onSourceModeChange: (mode: ScheduleSourceMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Źródło połączeń"
      className="inline-flex shrink-0 rounded-full bg-muted/70 p-0.5 dark:bg-muted/40"
    >
      {(
        [
          { value: "school", label: "Szkolny" },
          { value: "school-mzk", label: "Szkolny + MZK" },
        ] as const
      ).map((option) => {
        const active = sourceMode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={cn(
              "rounded-full px-2 py-0.5 text-[0.65rem] font-semibold transition-colors",
              active
                ? "bg-bus text-bus-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onSourceModeChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function BestTodayWidget({
  recommendation,
  sourceMode,
  onSourceModeChange,
}: BestTodayWidgetProps) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();

  return (
    <section
      aria-labelledby="best-today-heading"
      className="-mx-6 w-auto min-w-0 rounded-none border border-border/60 border-x-0 bg-white px-3 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] print:hidden sm:-mx-10 sm:px-3.5 sm:py-1.5 lg:mx-0 lg:rounded-2xl lg:border-x dark:border-border/40 dark:bg-card dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]"
    >
      <div className="flex h-7 items-center gap-1.5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-bus/40"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((current) => !current)}
        >
          <Sparkles className="size-3 shrink-0 text-bus" aria-hidden />
          <h2
            id="best-today-heading"
            className="truncate font-display text-[0.8125rem] font-semibold tracking-tight text-asphalt dark:text-foreground"
          >
            Najlepsze połączenia
          </h2>
          <span className="inline-flex shrink-0 items-center rounded-full bg-bus px-1.5 py-px text-[0.6rem] font-semibold tracking-wide text-bus-foreground uppercase">
            Dziś
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        <div className="shrink-0">
          <SourcePills
            sourceMode={sourceMode}
            onSourceModeChange={onSourceModeChange}
          />
        </div>
      </div>

      <div
        id={panelId}
        hidden={!expanded}
        className="mt-0.5 grid min-w-0 grid-cols-1 gap-0 overflow-hidden lg:mt-1.5 lg:grid-cols-2 lg:gap-3 lg:border-t lg:border-border/40 lg:pt-1.5"
      >
        <TripItem
          title="Do szkoły"
          direction="pickup"
          trip={recommendation.pickup}
        />
        <TripItem
          title="Ze szkoły"
          direction="dropoff"
          trip={recommendation.dropoff}
        />
      </div>
    </section>
  );
}
