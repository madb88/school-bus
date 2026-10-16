import { Flag, MapPin } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { timeToMinutes } from "@/lib/child-schedule/match";
import type { Stop } from "@/lib/dowozy/types";
import { formatTravelDuration } from "@/lib/mzk/filter-departures";
import type { TimelineEntry } from "@/lib/mzk/merge-timeline";
import type { MzkOdDeparture } from "@/lib/mzk/types";
import { cn } from "cn";

const tripBadgeBaseClass =
  "trip-badge inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";

/** Time column width — keep in sync with rail `before:` left offset. */
const tripTimeColClass = "w-[3.5rem] shrink-0 sm:w-[3.75rem]";
const tripRailColClass = "relative w-3 shrink-0";
/**
 * Timeline list with a continuous vertical rail (::before).
 * Offset = time column + gap-2.5 + half of rail column (w-3).
 */
export const tripTimelineListClass = cn(
  "trip-timeline-list relative flex flex-col",
  "before:pointer-events-none before:absolute before:top-3 before:bottom-3 before:left-[calc(3.5rem+0.625rem+0.375rem)] before:w-px before:bg-border/70 before:content-['']",
  "sm:before:left-[calc(3.75rem+0.625rem+0.375rem)] dark:before:bg-border/55",
);

export function TripBadge({
  variant,
  children,
}: {
  variant: "mzk" | "school";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        tripBadgeBaseClass,
        variant === "mzk"
          ? "bg-mzk/15 text-mzk-deep"
          : "bg-bus/15 text-bus-deep",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Index of the first run at/after lesson end, when a later run exists
 * (separator is rendered after that index).
 */
export function findLessonsEndedAfterIndex(
  times: string[],
  lessonEnd: string | null | undefined,
): number | null {
  if (!lessonEnd) return null;
  const endMin = timeToMinutes(lessonEnd);
  if (endMin === null) return null;

  let firstAtOrAfter = -1;
  for (let i = 0; i < times.length; i++) {
    const minutes = timeToMinutes(times[i]!);
    if (minutes !== null && minutes >= endMin) {
      firstAtOrAfter = i;
      break;
    }
  }
  if (firstAtOrAfter < 0 || firstAtOrAfter >= times.length - 1) return null;
  return firstAtOrAfter;
}

function TripRowShell({
  time,
  variant,
  isNext,
  stopId,
  children,
}: {
  time: string;
  variant: "school" | "mzk";
  isNext?: boolean;
  stopId?: string;
  children: ReactNode;
}) {
  const accent = variant === "school" ? "bus" : "mzk";

  return (
    <li
      id={stopId}
      className={cn(
        "relative flex gap-2.5 py-2.5 print:py-1.5",
        isNext &&
          (variant === "school"
            ? "rounded-lg bg-bus/[0.06] -mx-1.5 px-1.5 sm:-mx-2 sm:px-2"
            : "rounded-lg bg-mzk/[0.06] -mx-1.5 px-1.5 sm:-mx-2 sm:px-2"),
      )}
    >
      <div
        className={cn(
          tripTimeColClass,
          "flex flex-col items-end gap-0.5 pt-px text-right",
        )}
      >
        <time
          className={cn(
            "font-display text-lg font-semibold tabular-nums tracking-tight text-asphalt sm:text-xl print:text-base",
            isNext &&
              (variant === "school" ? "text-bus-deep" : "text-mzk-deep"),
          )}
        >
          {time}
        </time>
        {isNext ? (
          <span
            className={cn(
              "text-[0.55rem] leading-none font-medium tracking-[0.04em] uppercase",
              variant === "school" ? "text-bus-deep" : "text-mzk-deep",
            )}
          >
            Najbliższy
          </span>
        ) : null}
      </div>
      <div className={tripRailColClass} aria-hidden>
        <span
          className={cn(
            "absolute top-1 left-1/2 z-10 flex size-[11px] -translate-x-1/2 items-center justify-center rounded-full bg-card",
            isNext &&
              (accent === "bus" ? "ring-2 ring-bus/30" : "ring-2 ring-mzk/30"),
          )}
        >
          <span
            className={cn(
              "timeline-dot size-2 rounded-full",
              accent === "bus" ? "bg-bus" : "bg-mzk",
            )}
          />
        </span>
      </div>
      <div className="min-w-0 flex-1 self-center">{children}</div>
    </li>
  );
}

export function LessonsEndedRow() {
  return (
    <li
      role="separator"
      aria-label="Koniec zajęć lekcyjnych"
      className="relative flex gap-2.5 py-2 print:py-1"
    >
      <div className={tripTimeColClass} aria-hidden />
      <div className={tripRailColClass} aria-hidden>
        <span className="absolute top-0.5 left-1/2 z-10 flex size-4 -translate-x-1/2 items-center justify-center rounded-full bg-card ring-[3px] ring-card">
          <Flag className="size-2.5 text-muted-foreground" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 self-center">
        <span className="shrink-0 text-[0.7rem] font-medium text-muted-foreground">
          Koniec zajęć lekcyjnych
        </span>
        <span className="h-px min-w-4 flex-1 bg-border/50" aria-hidden />
      </div>
    </li>
  );
}

function PlacesRow({
  places,
  activePlaces,
  onSelectPlace,
}: {
  places: string[];
  activePlaces: string[] | null;
  onSelectPlace: (place: string) => void;
}) {
  if (places.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
      <MapPin
        className="size-3 shrink-0 text-muted-foreground/80"
        aria-hidden
      />
      {places.map((item) => (
        <PlaceChip
          key={item}
          place={item}
          highlight={Boolean(activePlaces?.includes(item))}
          onSelect={onSelectPlace}
        />
      ))}
    </div>
  );
}

export function DropoffRunsList({
  runs,
  lessonEnd,
  activePlaces,
  onSelectPlace,
  nextTripId,
  stopIdFor,
}: {
  runs: Stop[];
  lessonEnd?: string | null;
  activePlaces: string[] | null;
  onSelectPlace: (place: string) => void;
  nextTripId?: string | null;
  stopIdFor: (run: Stop, index: number) => string;
}) {
  const lessonsEndedAfterIndex = findLessonsEndedAfterIndex(
    runs.map((run) => run.time),
    lessonEnd,
  );

  return (
    <ul className={tripTimelineListClass}>
      {runs.map((run, index) => {
        const stopId = stopIdFor(run, index);
        return (
          <Fragment key={stopId}>
            <StopRow
              stopId={stopId}
              stop={run}
              activePlaces={activePlaces}
              onSelectPlace={onSelectPlace}
              isNext={nextTripId === stopId}
            />
            {lessonsEndedAfterIndex === index ? <LessonsEndedRow /> : null}
          </Fragment>
        );
      })}
    </ul>
  );
}

export function PlaceChip({
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
        "inline-flex cursor-pointer! items-center rounded-md px-1.5 py-0.5 text-sm transition-colors print:cursor-default print:px-0 print:py-0",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50 print:focus-visible:ring-0",
        highlight
          ? "bg-foreground/8 font-semibold text-asphalt ring-1 ring-foreground/15 hover:bg-foreground/12 print:bg-transparent print:ring-0"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground print:text-foreground",
      )}
      style={{ cursor: "pointer" }}
    >
      {place}
    </button>
  );
}

export function StopRow({
  stop,
  activePlaces,
  onSelectPlace,
  isNext,
  stopId,
}: {
  stop: Stop;
  activePlaces: string[] | null;
  onSelectPlace: (place: string) => void;
  isNext?: boolean;
  stopId?: string;
}) {
  return (
    <TripRowShell
      stopId={stopId}
      time={stop.time}
      variant="school"
      isNext={isNext}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <TripBadge variant="school">Szkolny</TripBadge>
        <PlacesRow
          places={stop.places}
          activePlaces={activePlaces}
          onSelectPlace={onSelectPlace}
        />
      </div>
    </TripRowShell>
  );
}

export function MzkDepartureRow({
  departure,
  stopId,
  isNext,
}: {
  departure: MzkOdDeparture;
  stopId?: string;
  isNext?: boolean;
}) {
  const duration = formatTravelDuration(
    departure.departTime,
    departure.arriveTime,
  );
  const headsign = departure.headsign.trim();

  return (
    <TripRowShell
      stopId={stopId}
      time={departure.departTime}
      variant="mzk"
      isNext={isNext}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <TripBadge variant="mzk">MZK {departure.route}</TripBadge>
          {headsign ? (
            <span className="min-w-0 text-sm font-medium text-foreground">
              {headsign}
            </span>
          ) : null}
        </div>
        <p className="text-xs tabular-nums text-muted-foreground">
          ok. {departure.arriveTime}
          {duration ? ` · ${duration}` : null}
        </p>
        <p className="text-xs break-words text-muted-foreground">
          {departure.boardStopName} → {departure.alightStopName}
        </p>
      </div>
    </TripRowShell>
  );
}

export function SchoolTimelineRow({
  entry,
  activePlaces,
  onSelectPlace,
  isNext,
}: {
  entry: Extract<TimelineEntry, { kind: "school" }>;
  activePlaces: string[] | null;
  onSelectPlace: (place: string) => void;
  isNext?: boolean;
}) {
  return (
    <TripRowShell
      stopId={entry.stopId}
      time={entry.time}
      variant="school"
      isNext={isNext}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <TripBadge variant="school">Szkolny</TripBadge>
          {entry.planLabels?.map((label) => (
            <span
              key={label}
              className="inline-flex max-w-full truncate rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[0.6875rem] font-medium text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
            >
              {label}
            </span>
          ))}
          {entry.context ? (
            <span className="min-w-0 text-xs text-muted-foreground">
              {entry.context}
            </span>
          ) : null}
        </div>
        <PlacesRow
          places={entry.places}
          activePlaces={activePlaces}
          onSelectPlace={onSelectPlace}
        />
      </div>
    </TripRowShell>
  );
}

export function TimelineList({
  entries,
  activePlaces,
  onSelectPlace,
  nextTripId,
  lessonEnd,
}: {
  entries: TimelineEntry[];
  activePlaces: string[] | null;
  onSelectPlace: (place: string) => void;
  nextTripId?: string | null;
  lessonEnd?: string | null;
}) {
  const lessonsEndedAfterIndex = findLessonsEndedAfterIndex(
    entries.map((entry) => entry.time),
    lessonEnd,
  );

  return (
    <ul className={tripTimelineListClass}>
      {entries.map((entry, index) => {
        const showLessonsEnded = lessonsEndedAfterIndex === index;

        if (entry.kind === "mzk") {
          const id = `mzk-${entry.departure.departTime}-${entry.departure.route}-${index}`;
          return (
            <Fragment key={id}>
              <MzkDepartureRow
                stopId={id}
                departure={entry.departure}
                isNext={nextTripId === id}
              />
              {showLessonsEnded ? <LessonsEndedRow /> : null}
            </Fragment>
          );
        }
        return (
          <Fragment key={entry.stopId}>
            <SchoolTimelineRow
              entry={entry}
              activePlaces={activePlaces}
              onSelectPlace={onSelectPlace}
              isNext={nextTripId === entry.stopId}
            />
            {showLessonsEnded ? <LessonsEndedRow /> : null}
          </Fragment>
        );
      })}
    </ul>
  );
}
