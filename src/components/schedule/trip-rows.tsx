import { Flag } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { timeToMinutes } from "@/lib/child-schedule/match";
import type { Stop } from "@/lib/dowozy/types";
import { formatTravelDuration } from "@/lib/mzk/filter-departures";
import type { TimelineEntry } from "@/lib/mzk/merge-timeline";
import type { MzkOdDeparture } from "@/lib/mzk/types";
import { cn } from "cn";

const tripBadgeBaseClass =
  "trip-badge inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";

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

export const tripRowCardClass =
  "rounded-lg border border-border/60 bg-card/80 px-3 py-2.5 sm:px-3.5 print:px-2 print:py-1.5";

export const tripRowGridClass =
  "grid grid-cols-[5rem_1fr] gap-2.5 sm:grid-cols-[5.25rem_1fr] sm:gap-3";

export const timelineRailClass = "relative pl-3 sm:pl-3.5";

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

export function LessonsEndedRow() {
  return (
    <li
      role="separator"
      aria-label="Koniec zajęć lekcyjnych"
      className="flex items-center gap-2 py-1.5"
    >
      <div className="h-px flex-1 bg-border/60" />
      <span className="inline-flex shrink-0 items-center gap-1 text-[0.7rem] font-medium text-muted-foreground">
        <Flag className="size-3 text-bus-deep/70" aria-hidden />
        Koniec zajęć lekcyjnych
      </span>
      <div className="h-px flex-1 bg-border/60" />
    </li>
  );
}

export function DropoffRunsList({
  runs,
  lessonEnd,
  activePlace,
  onSelectPlace,
  nextTripId,
  stopIdFor,
}: {
  runs: Stop[];
  lessonEnd?: string | null;
  activePlace: string | null;
  onSelectPlace: (place: string) => void;
  nextTripId?: string | null;
  stopIdFor: (run: Stop, index: number) => string;
}) {
  const lessonsEndedAfterIndex = findLessonsEndedAfterIndex(
    runs.map((run) => run.time),
    lessonEnd,
  );

  return (
    <ul className="flex flex-col gap-2 print:gap-1.5">
      {runs.map((run, index) => {
        const stopId = stopIdFor(run, index);
        return (
          <Fragment key={stopId}>
            <StopRow
              stopId={stopId}
              stop={run}
              activePlace={activePlace}
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
  activePlace,
  onSelectPlace,
  isNext,
  stopId,
}: {
  stop: Stop;
  activePlace: string | null;
  onSelectPlace: (place: string) => void;
  isNext?: boolean;
  stopId?: string;
}) {
  return (
    <li
      id={stopId}
      className={cn(
        tripRowCardClass,
        timelineRailClass,
        "border-l-2 border-l-bus/40 bg-bus/3",
        isNext && "border-l-bus bg-bus/10",
      )}
    >
      <div className={tripRowGridClass}>
        <div className="relative flex flex-col gap-0.5">
          <span
            aria-hidden
            className={cn(
              "timeline-dot absolute top-1.5 -left-4 size-1.5 rounded-full bg-bus sm:-left-4.5",
              isNext && "ring-2 ring-bus/30",
            )}
          />
          <time
            className={cn(
              "font-display text-lg font-bold tabular-nums tracking-tight text-asphalt sm:text-xl print:text-base",
              isNext && "text-bus-deep",
            )}
          >
            {stop.time}
          </time>
          {isNext ? (
            <span className="text-[0.65rem] font-semibold tracking-[0.12em] text-bus-deep uppercase">
              Najbliższy
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1 self-center">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <TripBadge variant="school">Szkolny</TripBadge>
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {stop.places.map((item) => (
              <PlaceChip
                key={item}
                place={item}
                highlight={activePlace !== null && item === activePlace}
                onSelect={onSelectPlace}
              />
            ))}
          </div>
        </div>
      </div>
    </li>
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
  const headsign =
    departure.headsign ||
    `${departure.boardStopName} → ${departure.alightStopName}`;

  return (
    <li
      id={stopId}
      className={cn(
        tripRowCardClass,
        timelineRailClass,
        "border-l-2 border-l-mzk/40 bg-mzk/3",
        isNext && "border-l-mzk bg-mzk/10",
      )}
    >
      <div className={tripRowGridClass}>
        <div className="relative flex flex-col gap-0.5">
          <span
            aria-hidden
            className={cn(
              "timeline-dot absolute top-1.5 -left-4 size-1.5 rounded-full bg-mzk sm:-left-4.5",
              isNext && "ring-2 ring-mzk/30",
            )}
          />
          <time
            className={cn(
              "font-display text-lg font-bold tabular-nums tracking-tight text-asphalt sm:text-xl print:text-base",
              isNext && "text-mzk-deep",
            )}
          >
            {departure.departTime}
          </time>
          {isNext ? (
            <span className="text-[0.65rem] font-semibold tracking-[0.12em] text-mzk-deep uppercase">
              Najbliższy
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 self-center">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <TripBadge variant="mzk">MZK {departure.route}</TripBadge>
            <span className="min-w-0 text-sm font-medium text-foreground">
              {headsign}
            </span>
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            ~ {departure.arriveTime}
            {duration ? ` · ${duration}` : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {departure.boardStopName} → {departure.alightStopName}
          </p>
        </div>
      </div>
    </li>
  );
}

export function SchoolTimelineRow({
  entry,
  activePlace,
  onSelectPlace,
  isNext,
}: {
  entry: Extract<TimelineEntry, { kind: "school" }>;
  activePlace: string | null;
  onSelectPlace: (place: string) => void;
  isNext?: boolean;
}) {
  return (
    <li
      id={entry.stopId}
      className={cn(
        tripRowCardClass,
        timelineRailClass,
        "border-l-2 border-l-bus/40 bg-bus/3",
        isNext && "border-l-bus bg-bus/10",
      )}
    >
      <div className={tripRowGridClass}>
        <div className="relative flex flex-col gap-0.5">
          <span
            aria-hidden
            className={cn(
              "timeline-dot absolute top-1.5 -left-4 size-1.5 rounded-full bg-bus sm:-left-4.5",
              isNext && "ring-2 ring-bus/30",
            )}
          />
          <time
            className={cn(
              "font-display text-lg font-bold tabular-nums tracking-tight text-asphalt sm:text-xl print:text-base",
              isNext && "text-bus-deep",
            )}
          >
            {entry.time}
          </time>
          {isNext ? (
            <span className="text-[0.65rem] font-semibold tracking-[0.12em] text-bus-deep uppercase">
              Najbliższy
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col gap-1 self-center">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <TripBadge variant="school">Szkolny</TripBadge>
            {entry.context ? (
              <span className="min-w-0 truncate text-xs text-muted-foreground">
                {entry.context}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            {entry.places.map((item) => (
              <PlaceChip
                key={item}
                place={item}
                highlight={activePlace !== null && item === activePlace}
                onSelect={onSelectPlace}
              />
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}

export function TimelineList({
  entries,
  activePlace,
  onSelectPlace,
  nextTripId,
  lessonEnd,
}: {
  entries: TimelineEntry[];
  activePlace: string | null;
  onSelectPlace: (place: string) => void;
  nextTripId?: string | null;
  lessonEnd?: string | null;
}) {
  const lessonsEndedAfterIndex = findLessonsEndedAfterIndex(
    entries.map((entry) => entry.time),
    lessonEnd,
  );

  return (
    <ul className="flex flex-col gap-2 print:gap-1.5">
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
              activePlace={activePlace}
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
