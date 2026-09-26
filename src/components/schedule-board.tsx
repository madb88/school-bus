"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  Clock,
  FilterX,
  Flag,
  Link2,
  Loader2,
  MapPin,
  Moon,
  Printer,
  Settings2,
  Sun,
  type LucideIcon,
} from "lucide-react";
import {
  Fragment,
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { WeekendPlaceholder } from "@/components/weekend-placeholder";
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dropoffFitsLessonEnd,
  formatTimeInput,
  getDayTimes,
  pickupFitsLessonStart,
  timeToMinutes,
} from "@/lib/child-schedule/match";
import {
  clampLessonMatchWindow,
  DEFAULT_LESSON_MATCH_WINDOW_MIN,
  getLessonMatchWindowSnapshot,
  MAX_LESSON_MATCH_WINDOW_MIN,
  MIN_LESSON_MATCH_WINDOW_MIN,
  saveLessonMatchWindow,
  subscribeLessonMatchWindow,
} from "@/lib/child-schedule/match-window";
import { savePreferredPlace } from "@/lib/child-schedule/preferred-place";
import {
  hasConfiguredLessons,
  loadLessonPlan,
} from "@/lib/child-schedule/storage";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import { usePreferredPlace } from "@/lib/child-schedule/use-preferred-place";
import {
  collectPlaces,
  countVisibleTrips,
  filterSchedule,
  type ScheduleDateFilter,
  type ScheduleDirection,
} from "@/lib/dowozy/filter-schedule";
import {
  filtersHref,
  parseFilterParams,
  serializeFilterParams,
  type ParsedFilterParams,
  type ScheduleSourceMode,
} from "@/lib/dowozy/filter-url";
import { findNextTrip, stopDomId } from "@/lib/dowozy/next-trip";
import {
  isSchoolDay,
  resolveTargetDay,
} from "@/lib/dowozy/schedule-dates";
import type { Schedule, Stop } from "@/lib/dowozy/types";
import { formatTravelDuration } from "@/lib/mzk/filter-departures";
import {
  buildMergedTimeline,
  findNextMergedEntry,
  type TimelineEntry,
} from "@/lib/mzk/merge-timeline";
import {
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import type { MzkOdDeparture } from "@/lib/mzk/types";
import { useMzkOdDepartures } from "@/lib/mzk/use-mzk-od-departures";
import { useMzkRoutePreference } from "@/lib/mzk/use-mzk-route";
import { dismissHint } from "@/lib/onboarding-hints";
import { useHintDismissed } from "@/lib/use-hint-dismissed";
import { cn } from "cn";
import { toast } from "sonner";

type ScheduleBoardProps = {
  schedule: Schedule;
  /** True when MZK snapshot exists on the server (full feed stays off the client). */
  mzkAvailable?: boolean;
  initialFilters: ParsedFilterParams;
};

function dateLabel(value: ScheduleDateFilter): string {
  if (value === "today") return "Dziś";
  if (value === "tomorrow") return "Jutro";
  return "Wszystkie dni";
}

function directionLabel(value: ScheduleDirection): string {
  if (value === "pickups") return "Do szkoły";
  if (value === "dropoffs") return "Ze szkoły";
  return "wszystkie kierunki";
}

function formatTripCount(count: number): string {
  if (count === 1) return "1 kurs";
  if (count >= 2 && count <= 4) return `${count} kursy`;
  return `${count} kursów`;
}

const tripBadgeBaseClass =
  "trip-badge inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";

function TripBadge({
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

const tripRowCardClass =
  "rounded-lg border border-border/60 bg-card/80 px-3 py-2.5 sm:px-3.5 print:px-2 print:py-1.5";

const timelineRailClass = "relative pl-3 sm:pl-3.5";

const filterToggleActiveClass =
  "border-transparent bg-bus text-bus-foreground shadow-none hover:bg-bus/90 hover:text-bus-foreground dark:border-transparent dark:bg-bus dark:text-bus-foreground dark:hover:bg-bus/85 dark:hover:text-bus-foreground";

function FilterFieldLabel({
  id,
  icon: Icon,
  children,
}: {
  id: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Label
      id={id}
      className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
    >
      <Icon className="size-3.5 text-bus-deep" aria-hidden />
      {children}
    </Label>
  );
}

function FilterTimeDisplay({
  value,
  emptyLabel,
}: {
  value: string | null | undefined;
  emptyLabel: string;
}) {
  return (
    <span
      className="inline-flex h-8 shrink-0 cursor-default items-center rounded-lg bg-muted/70 px-2.5 text-sm tabular-nums text-muted-foreground"
      title="Godzina z planu lekcji — tylko do odczytu"
    >
      <span className={value ? "text-foreground" : undefined}>
        {value ? formatTimeInput(value) : emptyLabel}
      </span>
    </span>
  );
}

function sourceModeLabel(value: ScheduleSourceMode): string {
  if (value === "school-mzk") return "Szkolny + MZK";
  return "Autobus szkolny";
}

/**
 * Index of the first run at/after lesson end, when a later run exists
 * (separator is rendered after that index).
 */
function findLessonsEndedAfterIndex(
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

function LessonsEndedRow() {
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

function DropoffRunsList({
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
        "inline-flex cursor-pointer! items-center rounded-md px-1.5 py-0.5 text-sm transition-colors print:cursor-default print:px-0 print:py-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 print:focus-visible:ring-0",
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

function StopRow({
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
      <div className="grid grid-cols-[3.75rem_1fr] gap-2.5 sm:grid-cols-[4.25rem_1fr] sm:gap-3">
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

function MzkDepartureRow({
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
      <div className="grid grid-cols-[3.75rem_1fr] gap-2.5 sm:grid-cols-[4.25rem_1fr] sm:gap-3">
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

function SchoolTimelineRow({
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
      <div className="grid grid-cols-[3.75rem_1fr] gap-2.5 sm:grid-cols-[4.25rem_1fr] sm:gap-3">
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

function TimelineList({
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

function SectionHeading({
  id,
  title,
  subtitle,
  tripCount,
  icon: Icon,
  iconClassName,
}: {
  id: string;
  title: string;
  subtitle: string;
  tripCount: number;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/50 pb-3 print:mb-2 print:pb-2">
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-asphalt sm:text-xl print:text-base"
        >
          <Icon
            className={cn("size-5 shrink-0 print:size-4", iconClassName)}
            aria-hidden
          />
          <span className="min-w-0 truncate">{title}</span>
        </h2>
        <p className="mt-0.5 pl-7 text-xs text-muted-foreground print:pl-6">
          {subtitle}
        </p>
      </div>
      <span className="shrink-0 pt-1 text-xs font-medium tabular-nums text-muted-foreground">
        {formatTripCount(tripCount)}
      </span>
    </div>
  );
}

function DirectionSection({
  headingId,
  title,
  subtitle,
  tripCount,
  icon,
  iconClassName,
  children,
}: {
  headingId: string;
  title: string;
  subtitle: string;
  tripCount: number;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="schedule-direction-section min-w-0 rounded-xl border border-border/70 bg-card/90 p-3 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:p-4 print:break-inside-avoid print:p-2 print:shadow-none"
    >
      <SectionHeading
        id={headingId}
        title={title}
        subtitle={subtitle}
        tripCount={tripCount}
        icon={icon}
        iconClassName={iconClassName}
      />
      {children}
    </section>
  );
}

export function ScheduleBoard({
  schedule,
  mzkAvailable = false,
  initialFilters,
}: ScheduleBoardProps) {
  const places = collectPlaces(schedule);
  const lessonPlan = useLessonPlan();
  const preferredPlace = usePreferredPlace();
  const mzkRoute = useMzkRoutePreference();
  const planReady = hasConfiguredLessons(lessonPlan);
  const mzkRouteConfigured = hasConfiguredMzkRoute(mzkRoute);
  const mzkRouteReady = mzkAvailable && mzkRouteConfigured;
  const defaultPlace = preferredPlace ?? lessonPlan.place;
  const router = useRouter();
  const pathname = usePathname();

  const urlPlaceValid =
    typeof initialFilters.place === "string" &&
    places.includes(initialFilters.place)
      ? initialFilters.place
      : initialFilters.place === null
        ? null
        : undefined;

  // `undefined` override = follow local defaults from synced stores / URL absence.
  const [matchLessonPlanOverride, setMatchLessonPlan] = useState<
    boolean | undefined
  >(initialFilters.matchLessonPlan);
  const [placeOverride, setPlaceOverride] = useState<string | null | undefined>(
    urlPlaceValid,
  );
  const [direction, setDirection] = useState<ScheduleDirection>(
    initialFilters.direction ?? "all",
  );
  const [sourceModeOverride, setSourceMode] = useState<
    ScheduleSourceMode | undefined
  >(initialFilters.sourceMode);
  const [showAllMzkConnections, setShowAllMzkConnections] = useState(false);
  const storedWindowRaw = useSyncExternalStore(
    subscribeLessonMatchWindow,
    getLessonMatchWindowSnapshot,
    () => String(DEFAULT_LESSON_MATCH_WINDOW_MIN),
  );
  const lessonMatchWindowMin = clampLessonMatchWindow(Number(storedWindowRaw));
  const [windowDraft, setWindowDraft] = useState<string | null>(null);
  const [dateFilterOverride, setDateFilter] = useState<
    ScheduleDateFilter | undefined
  >(initialFilters.dateFilter);
  const [now, setNow] = useState(() => new Date());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [extraOptionsOpen, setExtraOptionsOpen] = useState(false);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [filtersStuck, setFiltersStuck] = useState(false);
  const filtersSentinelRef = useRef<HTMLDivElement>(null);
  // Wait for localStorage prefs (plan / miejsce / MZK) before painting trips —
  // otherwise SSR empty defaults flash into filtered client content.
  // useSyncExternalStore avoids setState-in-effect (server=false, client=true).
  const prefsReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const planHintDismissed = useHintDismissed("plan");
  const mzkHintDismissed = useHintDismissed("mzk");
  const skipUrlWrite = useRef(false);

  const matchLessonPlan = matchLessonPlanOverride ?? planReady;
  const sourceMode =
    sourceModeOverride ?? (mzkRouteReady ? "school-mzk" : "school");
  const matchActive = matchLessonPlan && planReady;
  const place =
    placeOverride === undefined
      ? matchActive
        ? lessonPlan.place
        : defaultPlace
      : placeOverride;
  const dateFilter = dateFilterOverride ?? "today";
  const windowDraftValue = windowDraft ?? String(lessonMatchWindowMin);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const sentinel = filtersSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setFiltersStuck(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Keep address bar in sync so filters are shareable.
  useEffect(() => {
    if (skipUrlWrite.current) {
      skipUrlWrite.current = false;
      return;
    }

    const qs = serializeFilterParams({
      place,
      dateFilter,
      direction,
      matchLessonPlan,
      sourceMode,
      persistMatchOff: planReady && !matchLessonPlan,
      persistSourceSchool: mzkRouteReady && sourceMode === "school",
    });
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next === current) return;

    router.replace(next, { scroll: false });
  }, [
    place,
    dateFilter,
    direction,
    matchLessonPlan,
    sourceMode,
    planReady,
    mzkRouteReady,
    pathname,
    router,
  ]);

  // Browser back/forward.
  useEffect(() => {
    function onPopState() {
      const parsed = parseFilterParams(
        new URLSearchParams(window.location.search),
      );
      skipUrlWrite.current = true;
      startTransition(() => {
        const nextMatch =
          parsed.matchLessonPlan ??
          hasConfiguredLessons(loadLessonPlan());
        const nextSource =
          parsed.sourceMode ??
          (hasConfiguredMzkRoute(loadMzkRoutePreference())
            ? "school-mzk"
            : "school");
        setMatchLessonPlan(nextMatch);
        setDirection(parsed.direction ?? "all");
        setSourceMode(nextSource);
        setDateFilter(parsed.dateFilter ?? "today");
        if (parsed.place === undefined) {
          setPlaceOverride(undefined);
        } else if (
          parsed.place === null ||
          places.includes(parsed.place)
        ) {
          setPlaceOverride(parsed.place);
        }
      });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [places]);

  const deferredPlace = useDeferredValue(place);
  const deferredDirection = useDeferredValue(direction);
  const deferredDateFilter = useDeferredValue(dateFilter);
  const deferredMatch = useDeferredValue(matchActive);
  const deferredSourceMode = useDeferredValue(sourceMode);
  const deferredWindowMin = useDeferredValue(lessonMatchWindowMin);

  const filtered = filterSchedule(schedule, {
    place: deferredPlace,
    direction: deferredDirection,
    dateFilter: deferredDateFilter,
    lessonPlan,
    matchLessonPlan: deferredMatch,
    lessonMatchWindowMin: deferredWindowMin,
    now,
  });

  const target = resolveTargetDay(deferredDateFilter, now);
  const dayTimes =
    deferredMatch && target
      ? getDayTimes(lessonPlan, target.weekday)
      : undefined;
  // Koniec lekcji z planu — także bez matcha, pod separator w Odwozach.
  const planLessonEnd = target
    ? getDayTimes(lessonPlan, target.weekday)?.end
    : undefined;
  const planBlocksDay =
    deferredMatch &&
    target !== null &&
    isSchoolDay(target.weekday) &&
    !dayTimes;

  const mzkFetchEnabled =
    deferredSourceMode === "school-mzk" && mzkRouteReady && !planBlocksDay;

  const {
    data: mzkOd,
    loading: mzkLoading,
    error: mzkFetchError,
  } = useMzkOdDepartures({
    enabled: mzkFetchEnabled,
    boardStopId: mzkRoute.boardStopId,
    alightStopId: mzkRoute.alightStopId,
    dateFilter: deferredDateFilter,
    route: mzkRoute.route,
  });

  const rawMzkPickups =
    mzkFetchEnabled &&
    (deferredDirection === "all" || deferredDirection === "pickups")
      ? mzkOd.pickups
      : [];
  const rawMzkDropoffs =
    mzkFetchEnabled &&
    (deferredDirection === "all" || deferredDirection === "dropoffs")
      ? mzkOd.dropoffs.filter((d) => {
          // Powroty po 18:00 nie są potrzebne przy dowozach szkolnych.
          const minutes = timeToMinutes(d.departTime);
          return minutes !== null && minutes <= 18 * 60;
        })
      : [];

  const applyLessonFilter =
    deferredMatch && !showAllMzkConnections && Boolean(dayTimes);

  const lessonStart = dayTimes?.start;
  const lessonEnd = dayTimes?.end;

  const mzkPickups =
    applyLessonFilter && lessonStart
      ? rawMzkPickups.filter((d) =>
          // Przyjazd do szkoły ma zmieścić się w oknie przed startem lekcji.
          pickupFitsLessonStart(d.arriveTime, lessonStart, deferredWindowMin),
        )
      : rawMzkPickups;
  const mzkDropoffs =
    applyLessonFilter && lessonEnd
      ? rawMzkDropoffs.filter((d) =>
          // Odjazd ze szkoły w oknie po zakończeniu lekcji.
          dropoffFitsLessonEnd(d.departTime, lessonEnd, deferredWindowMin),
        )
      : rawMzkDropoffs;

  const hiddenMzkCount =
    rawMzkPickups.length -
    mzkPickups.length +
    (rawMzkDropoffs.length - mzkDropoffs.length);

  const mzkDeparturesCount = mzkPickups.length + mzkDropoffs.length;
  const mergedTimeline =
    deferredSourceMode === "school-mzk"
      ? buildMergedTimeline({
          schedule: filtered,
          mzkPickups,
          mzkDropoffs,
          direction: deferredDirection,
        })
      : null;
  const schoolTripCount = countVisibleTrips(filtered);
  const tripCount = schoolTripCount + mzkDeparturesCount;
  const schoolEmpty = schoolTripCount === 0;
  const isEmpty = schoolEmpty && mzkDeparturesCount === 0;
  const isWeekendView = target !== null && !isSchoolDay(target.weekday);

  const nextTrip =
    deferredDateFilter === "today" &&
    deferredSourceMode === "school" &&
    !schoolEmpty
      ? findNextTrip(filtered, now)
      : null;

  const nextMerged =
    deferredDateFilter === "today" && mergedTimeline
      ? findNextMergedEntry(mergedTimeline, now)
      : null;

  const hasActiveFilters =
    Boolean(place) ||
    dateFilter !== "today" ||
    direction !== "all" ||
    matchActive ||
    sourceMode !== "school";

  const activeFilterCount = [
    Boolean(place),
    dateFilter !== "today",
    direction !== "all",
    matchActive,
    sourceMode !== "school",
  ].filter(Boolean).length;

  const showPlanHint = !planReady && !planHintDismissed;
  const showMzkHint =
    !mzkRouteConfigured && !mzkHintDismissed && sourceMode === "school-mzk";

  const placeItems = [
    { label: "Wszystkie miejsca", value: null as string | null },
    ...places.map((item) => ({ label: item, value: item })),
  ];

  const mobileDateItems = [
    { label: "Dziś", value: "today" as const },
    { label: "Jutro", value: "tomorrow" as const },
  ];

  const mobileDirectionItems = [
    { label: "Wszystkie", value: "all" as const },
    { label: "Do szkoły", value: "pickups" as const },
    { label: "Ze szkoły", value: "dropoffs" as const },
  ];

  function persistPlace(next: string | null) {
    savePreferredPlace(next);
  }

  function commitLessonMatchWindow(raw: string) {
    const parsed = Number(raw);
    const next = clampLessonMatchWindow(
      Number.isFinite(parsed) ? parsed : lessonMatchWindowMin,
    );
    setWindowDraft(null);
    saveLessonMatchWindow(next);
  }

  function enableMatchPlan() {
    startTransition(() => {
      setMatchLessonPlan(true);
      setShowAllMzkConnections(false);
      setPlaceOverride(undefined);
      if (dateFilter === "all") setDateFilter("today");
    });
  }

  function selectPlace(nextPlace: string) {
    startTransition(() => {
      if (place === nextPlace) {
        setPlaceOverride(null);
        persistPlace(null);
      } else {
        setPlaceOverride(nextPlace);
        persistPlace(nextPlace);
      }
    });
  }

  function clearFilters() {
    startTransition(() => {
      setPlaceOverride(null);
      persistPlace(null);
      setDateFilter("today");
      setDirection("all");
      setMatchLessonPlan(false);
      setShowAllMzkConnections(false);
      setSourceMode("school");
    });
  }

  async function copyShareLink() {
    const href = filtersHref({
      place,
      dateFilter,
      direction,
      matchLessonPlan,
      sourceMode,
    });
    const absolute = new URL(href, window.location.origin).toString();
    const shareNote =
      "Link zawiera filtry rozkładu. Plan lekcji i trasa MZK zostają tylko w tej przeglądarce.";

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Dojazdy do szkoły",
          text: shareNote,
          url: absolute,
        });
        setCopiedFlash(true);
        window.setTimeout(() => setCopiedFlash(false), 2000);
        return;
      } catch (error) {
        // User cancelled share sheet — don't fall through to clipboard toast.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(absolute);
      setCopiedFlash(true);
      window.setTimeout(() => setCopiedFlash(false), 2000);
      toast.message("Link skopiowany", { description: shareNote });
    } catch {
      window.prompt(`${shareNote}\n\nSkopiuj link:`, absolute);
    }
  }

  const sourceItems = [
    { label: "Szkolny", value: "school" as const },
    { label: "Szkolny + MZK", value: "school-mzk" as const },
  ];

  const planItems = [
    { label: "Bez planu", value: "off" as const },
    { label: "Do planu lekcji", value: "on" as const },
  ];

  const showMzkPlanToggle =
    matchActive &&
    sourceMode === "school-mzk" &&
    (hiddenMzkCount > 0 || showAllMzkConnections);

  const hoursFilterBody = matchActive && dayTimes ? (
    <div className="flex flex-nowrap items-center gap-x-1.5 whitespace-nowrap">
      <FilterTimeDisplay value={dayTimes.start} emptyLabel="—" />
      <span className="text-muted-foreground" aria-hidden>
        –
      </span>
      <FilterTimeDisplay value={dayTimes.end} emptyLabel="—" />
      <label className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <span>obejmuje</span>
        <input
          type="number"
          inputMode="numeric"
          min={MIN_LESSON_MATCH_WINDOW_MIN}
          max={MAX_LESSON_MATCH_WINDOW_MIN}
          step={5}
          value={windowDraftValue}
          aria-label="Okno dopasowania do planu w minutach"
          onChange={(event) => setWindowDraft(event.target.value)}
          onBlur={() => commitLessonMatchWindow(windowDraftValue)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="h-8 w-12 rounded-lg border border-border bg-card px-1 text-center text-sm tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
        />
        <span>min</span>
      </label>
    </div>
  ) : matchActive && target && !dayTimes ? (
    <p className="text-xs text-muted-foreground">
      Brak godzin —{" "}
      <Link
        href="/lekcje"
        className="underline underline-offset-2 hover:text-foreground"
      >
        uzupełnij
      </Link>
    </p>
  ) : (
    <p className="text-xs text-muted-foreground">
      {planReady ? (
        <>Włącz „Do planu lekcji”, żeby dopasować kursy.</>
      ) : (
        <>
          <Link
            href="/lekcje"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Ustaw plan lekcji
          </Link>
          , żeby zobaczyć godziny.
        </>
      )}
    </p>
  );

  const primaryFilters = (
    <div className="flex flex-col gap-4 p-3 sm:p-4 md:flex-row md:items-start md:gap-0 md:divide-x md:divide-border/70">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:pr-4">
        <FilterFieldLabel id="schedule-place-filter-label" icon={MapPin}>
          Miejsce
        </FilterFieldLabel>
        <Select
          items={placeItems}
          value={place}
          onValueChange={(next) => {
            startTransition(() => {
              setPlaceOverride(next);
              persistPlace(next);
            });
          }}
        >
          <SelectTrigger
            aria-labelledby="schedule-place-filter-label"
            className="w-full max-w-full border-border bg-card"
          >
            <SelectValue placeholder="Wszystkie miejsca" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {placeItems.map((item) => (
              <SelectItem key={item.value ?? "__all"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 md:px-4">
        <FilterFieldLabel id="schedule-date-filter-label" icon={CalendarDays}>
          Kiedy?
        </FilterFieldLabel>
        <ButtonGroup aria-labelledby="schedule-date-filter-label">
          {(
            [
              ["today", "Dziś"],
              ["tomorrow", "Jutro"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              aria-pressed={dateFilter === value}
              className={cn(dateFilter === value && filterToggleActiveClass)}
              onClick={() => {
                startTransition(() => setDateFilter(value));
              }}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5 md:px-4">
        <FilterFieldLabel
          id="schedule-direction-filter-label"
          icon={ArrowLeftRight}
        >
          Kierunek
        </FilterFieldLabel>
        <ButtonGroup aria-labelledby="schedule-direction-filter-label">
          {(
            [
              ["all", "Wszystkie"],
              ["pickups", "Do szkoły"],
              ["dropoffs", "Ze szkoły"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              aria-pressed={direction === value}
              className={cn(direction === value && filterToggleActiveClass)}
              onClick={() => {
                startTransition(() => setDirection(value));
              }}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div className="flex min-w-0 shrink-0 flex-col gap-1.5 md:pl-4 md:min-w-[17.5rem]">
        <FilterFieldLabel id="schedule-hours-filter-label" icon={Clock}>
          Godziny lekcyjne
        </FilterFieldLabel>
        <div aria-labelledby="schedule-hours-filter-label">
          {hoursFilterBody}
        </div>
      </div>
    </div>
  );

  const additionalOptions = (
    <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/35 px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
        <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground md:inline-flex">
          <Settings2 className="size-3.5 text-bus-deep" aria-hidden />
          Dodatkowe opcje:
        </span>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1.5">
            <Label
              id="schedule-source-filter-label"
              className="text-xs text-muted-foreground"
            >
              Autobus
            </Label>
            <Select
              items={sourceItems}
              value={sourceMode}
              onValueChange={(next) => {
                if (next === "school" || next === "school-mzk") {
                  startTransition(() => setSourceMode(next));
                }
              }}
            >
              <SelectTrigger
                aria-labelledby="schedule-source-filter-label"
                className="w-auto min-w-[8.5rem] border-border bg-card"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {sourceItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Label
              id="schedule-lesson-plan-label"
              className="text-xs text-muted-foreground"
            >
              Plan lekcji
            </Label>
            {planReady ? (
              <Select
                items={planItems}
                value={matchActive ? "on" : "off"}
                onValueChange={(next) => {
                  if (next === "on") {
                    enableMatchPlan();
                  } else if (next === "off") {
                    startTransition(() => {
                      setMatchLessonPlan(false);
                      setShowAllMzkConnections(false);
                    });
                  }
                }}
              >
                <SelectTrigger
                  aria-labelledby="schedule-lesson-plan-label"
                  className="w-auto min-w-[9.5rem] border-border bg-card"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {planItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Link
                href="/lekcje"
                className="inline-flex h-8 items-center rounded-lg border border-border bg-card px-2.5 text-sm font-medium hover:bg-muted"
              >
                Ustaw plan
              </Link>
            )}
            {showMzkPlanToggle ? (
              <Button
                type="button"
                variant="outline"
                aria-pressed={showAllMzkConnections}
                className={cn(
                  showAllMzkConnections && filterToggleActiveClass,
                )}
                onClick={() => {
                  startTransition(() =>
                    setShowAllMzkConnections((current) => !current),
                  );
                }}
              >
                {showAllMzkConnections
                  ? "Tylko do planu"
                  : `Wszystkie MZK${hiddenMzkCount > 0 ? ` (+${hiddenMzkCount})` : ""}`}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:justify-end">
        <Button
          type="button"
          variant="outline"
          className="bg-card"
          aria-label="Drukuj"
          onClick={() => {
            window.print();
          }}
        >
          <Printer aria-hidden />
          <span>Drukuj</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="bg-card"
          aria-label={copiedFlash ? "Skopiowano" : "Kopiuj link"}
          onClick={() => {
            void copyShareLink();
          }}
        >
          {copiedFlash ? <Check aria-hidden /> : <Link2 aria-hidden />}
          <span>{copiedFlash ? "Skopiowano" : "Kopiuj link"}</span>
        </Button>
        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            className="text-bus-deep hover:bg-bus/10 hover:text-bus-deep"
            aria-label="Wyczyść filtry"
            onClick={clearFilters}
          >
            <FilterX aria-hidden />
            <span>Wyczyść filtry</span>
          </Button>
        ) : null}
      </div>
    </div>
  );

  const filterSummaryPrimary = (
    <>
      {place ? (
        <span className="font-medium text-foreground">{place}</span>
      ) : (
        "Wszystkie miejsca"
      )}
      {" · "}
      {dateLabel(dateFilter)}
      {" · "}
      {directionLabel(direction)}
    </>
  );

  const filterSummarySecondaryParts = [
    matchActive ? "plan" : null,
    sourceMode !== "school" ? sourceModeLabel(sourceMode) : null,
  ].filter(Boolean);

  const tripCountLabel = formatTripCount(tripCount);

  return (
    <div className="space-y-10">
      <header className="hidden print:block">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          Dojazdy do szkoły
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
          {schedule.title || "Rozkład dowozów"}
        </h1>
        {schedule.periodLabel ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Obowiązuje: {schedule.periodLabel}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-foreground">
          {filterSummaryPrimary}
          {filterSummarySecondaryParts.length > 0
            ? ` · ${filterSummarySecondaryParts.join(" · ")}`
            : null}
          {isWeekendView ? null : (
            <>
              {" · "}
              {tripCountLabel}
            </>
          )}
        </p>
      </header>

      <div
        ref={filtersSentinelRef}
        aria-hidden
        className="pointer-events-none h-px w-full print:hidden"
      />
      <div className="sticky top-0 z-10 -mx-6 pb-2 print:hidden sm:-mx-10 md:py-2.5">
        <div
          className={cn(
            "overflow-hidden rounded-b-xl border border-border/70 bg-card shadow-[0_10px_28px_-18px_color-mix(in_srgb,var(--foreground)_45%,transparent)] transition-[border-top-left-radius,border-top-right-radius] duration-300 ease-out motion-reduce:transition-none md:rounded-t-xl",
            filtersStuck ? "rounded-t-none" : "rounded-t-xl",
          )}
        >
          {/* Mobile: compact bar + place / day / direction */}
          <div className="flex flex-col gap-2 border-b border-border/60 p-3 md:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={filtersOpen ? "secondary" : "outline"}
                aria-expanded={filtersOpen}
                aria-controls="schedule-filters-panel"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                Filtry
                {activeFilterCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-bus/15 px-1 text-[0.7rem] font-semibold text-bus-deep tabular-nums">
                    {activeFilterCount}
                  </span>
                ) : null}
                <span aria-hidden className="text-muted-foreground">
                  {filtersOpen ? "▴" : "▾"}
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={extraOptionsOpen ? "secondary" : "outline"}
                aria-expanded={extraOptionsOpen}
                aria-controls="schedule-extra-options-panel"
                onClick={() => setExtraOptionsOpen((open) => !open)}
              >
                <Settings2 aria-hidden />
                Dodatkowe opcje
                <span aria-hidden className="text-muted-foreground">
                  {extraOptionsOpen ? "▴" : "▾"}
                </span>
              </Button>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <Label
                htmlFor="schedule-mobile-place"
                className="text-xs text-muted-foreground"
              >
                Miejsce
              </Label>
              <NativeSelect
                id="schedule-mobile-place"
                size="sm"
                className="w-full max-w-full"
                value={place ?? ""}
                onChange={(event) => {
                  const next = event.target.value || null;
                  startTransition(() => {
                    setPlaceOverride(next);
                    persistPlace(next);
                  });
                }}
              >
                {placeItems.map((item) => (
                  <NativeSelectOption
                    key={item.value ?? "__all"}
                    value={item.value ?? ""}
                  >
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex min-w-0 flex-col gap-1">
                <Label
                  htmlFor="schedule-mobile-date"
                  className="text-xs text-muted-foreground"
                >
                  Kiedy?
                </Label>
                <NativeSelect
                  id="schedule-mobile-date"
                  size="sm"
                  className="w-full max-w-full"
                  value={dateFilter === "all" ? "today" : dateFilter}
                  onChange={(event) => {
                    const next = event.target.value as ScheduleDateFilter;
                    startTransition(() => setDateFilter(next));
                  }}
                >
                  {mobileDateItems.map((item) => (
                    <NativeSelectOption key={item.value} value={item.value}>
                      {item.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <Label
                  htmlFor="schedule-mobile-direction"
                  className="text-xs text-muted-foreground"
                >
                  Kierunek
                </Label>
                <NativeSelect
                  id="schedule-mobile-direction"
                  size="sm"
                  className="w-full max-w-full"
                  value={direction}
                  onChange={(event) => {
                    const next = event.target.value as ScheduleDirection;
                    startTransition(() => setDirection(next));
                  }}
                >
                  {mobileDirectionItems.map((item) => (
                    <NativeSelectOption key={item.value} value={item.value}>
                      {item.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </div>

          <div
            id="schedule-filters-panel"
            className={cn(filtersOpen ? "block" : "hidden", "md:block")}
          >
            <div className="hidden md:block">{primaryFilters}</div>
            <div className="border-b border-border/60 p-3 md:hidden">
              <div className="flex flex-col gap-1.5">
                <FilterFieldLabel id="schedule-mobile-hours-label" icon={Clock}>
                  Godziny lekcyjne
                </FilterFieldLabel>
                <div aria-labelledby="schedule-mobile-hours-label">
                  {hoursFilterBody}
                </div>
              </div>
            </div>
          </div>

          <div
            id="schedule-extra-options-panel"
            className={cn(extraOptionsOpen ? "block" : "hidden", "md:block")}
          >
            {additionalOptions}
          </div>

          <div className="flex flex-col gap-1.5 border-t border-border/60 px-3 py-2.5 sm:px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm text-foreground">
                  {filterSummaryPrimary}
                </p>
                {filterSummarySecondaryParts.length > 0 ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {filterSummarySecondaryParts.join(" · ")}
                  </p>
                ) : null}
              </div>
              {isWeekendView ? null : (
                <span className="inline-flex shrink-0 items-center rounded-full bg-bus/15 px-2.5 py-0.5 text-[0.7rem] font-semibold text-bus-deep tabular-nums">
                  {tripCountLabel}
                </span>
              )}
            </div>
            {nextMerged ? (
              <p className="text-xs text-foreground sm:text-sm">
                <span className="font-semibold text-bus-deep">
                  Najbliższy kurs
                </span>
                {": "}
                <a
                  href={`#${nextMerged.id}`}
                  className="font-display font-bold tabular-nums underline-offset-2 hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(nextMerged.id)?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                >
                  {nextMerged.time}
                </a>
                {" · "}
                {nextMerged.label}
                {" · "}
                {nextMerged.kind === "pickup" ? "dowóz" : "odwóz"}
              </p>
            ) : nextTrip ? (
              <p className="text-xs text-foreground sm:text-sm">
                <span className="font-semibold text-bus-deep">
                  Najbliższy kurs
                </span>
                {": "}
                <a
                  href={`#${nextTrip.id}`}
                  className="font-display font-bold tabular-nums underline-offset-2 hover:underline"
                  onClick={(event) => {
                    event.preventDefault();
                    document.getElementById(nextTrip.id)?.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }}
                >
                  {nextTrip.time}
                </a>
                {" · "}
                {nextTrip.places.join(", ")}
                {" · "}
                {nextTrip.kind === "pickup" ? "dowóz" : "odwóz"}
                {nextTrip.context ? ` (${nextTrip.context})` : null}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {showPlanHint || showMzkHint ? (
        <div className="grid gap-2 print:hidden">
          {showPlanHint ? (
            <div className="rounded-xl border border-border/70 border-l-2 border-l-bus/50 bg-card px-4 py-3 text-sm text-muted-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
              <p className="font-medium text-foreground">Ustaw plan lekcji</p>
              <p className="mt-1 leading-relaxed">
                Dodaj godziny zajęć, żeby rozkład dopasował kursy do startu i
                końca lekcji.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Link
                  href="/lekcje"
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                >
                  Przejdź do planu lekcji
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dismissHint("plan");
                  }}
                >
                  Nie teraz
                </Button>
              </div>
            </div>
          ) : null}
          {showMzkHint ? (
            <div className="rounded-xl border border-border/70 border-l-2 border-l-mzk/50 bg-card px-4 py-3 text-sm text-muted-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
              <p className="font-medium text-foreground">
                Ustaw przystanek MZK
              </p>
              <p className="mt-1 leading-relaxed">
                Wybierz wsiadanie i wysiadanie, żeby zobaczyć kursy miejskie
                razem ze szkolnymi — jako alternatywę dla autobusów szkolnych.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Link
                  href="/mzk"
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                >
                  Ustaw trasę MZK
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    dismissHint("mzk");
                  }}
                >
                  Nie teraz
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!prefsReady ? (
        <div
          className="flex min-h-[14rem] flex-col items-center justify-center gap-2.5 print:hidden"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="size-5 animate-spin text-bus" aria-hidden />
          <span className="text-xs text-muted-foreground">
            Ładowanie rozkładu…
          </span>
        </div>
      ) : isWeekendView ? (
        <WeekendPlaceholder
          day={deferredDateFilter === "tomorrow" ? "tomorrow" : "today"}
        />
      ) : isEmpty ? (
        <p className="border-l-2 border-border bg-muted/30 px-4 py-8 text-center text-muted-foreground">
          {sourceMode === "school-mzk" && !mzkAvailable ? (
            <>Rozkład MZK jest chwilowo niedostępny.</>
          ) : sourceMode === "school-mzk" && mzkLoading ? (
            <>Ładowanie kursów MZK…</>
          ) : sourceMode === "school-mzk" && mzkFetchError ? (
            <>
              Nie udało się pobrać kursów MZK. Odśwież stronę lub spróbuj
              ponownie za chwilę.
            </>
          ) : sourceMode === "school-mzk" && !mzkRouteConfigured ? (
            <>
              Ustaw trasę MZK (wsiadanie → wysiadanie) w{" "}
              <Link
                href="/mzk"
                className="underline underline-offset-2 hover:text-foreground"
              >
                ustawieniach MZK
              </Link>
              .
            </>
          ) : sourceMode === "school-mzk" &&
            applyLessonFilter &&
            hiddenMzkCount > 0 &&
            !showAllMzkConnections ? (
            <>
              Brak kursów pasujących do planu lekcji. Jest {hiddenMzkCount}{" "}
              {hiddenMzkCount === 1
                ? "kurs MZK"
                : hiddenMzkCount < 5
                  ? "kursy MZK"
                  : "kursów MZK"}{" "}
              poza oknem (±{lessonMatchWindowMin} min).{" "}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-2 hover:text-mzk-deep"
                onClick={() => {
                  startTransition(() => setShowAllMzkConnections(true));
                }}
              >
                Pokaż wszystkie połączenia MZK
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </p>
      ) : sourceMode === "school-mzk" && mergedTimeline ? (
        <div className="space-y-6">
          {mzkRouteReady &&
          mzkDeparturesCount === 0 &&
          applyLessonFilter &&
          hiddenMzkCount > 0 &&
          !showAllMzkConnections ? (
            <p className="border-l-2 border-mzk/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground print:hidden">
              Brak kursów MZK pasujących do planu lekcji (+{hiddenMzkCount} poza
              oknem).{" "}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-2 hover:text-mzk-deep"
                onClick={() => {
                  startTransition(() => setShowAllMzkConnections(true));
                }}
              >
                Pokaż wszystkie połączenia MZK
              </button>
            </p>
          ) : null}

          {mzkRouteReady &&
          mzkDeparturesCount === 0 &&
          !(applyLessonFilter && hiddenMzkCount > 0 && !showAllMzkConnections) ? (
            <p className="border-l-2 border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground print:hidden">
              Brak bezpośrednich kursów MZK na tej trasie w wybranym dniu — poniżej
              tylko kursy szkolne.{" "}
              <Link
                href="/mzk"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Zmień trasę
              </Link>
              .
            </p>
          ) : null}

          <div
            className={cn(
              "grid items-start gap-4 print:gap-2",
              mergedTimeline.pickups.length > 0 &&
                mergedTimeline.dropoffs.length > 0
                ? "lg:grid-cols-2 print:grid-cols-2"
                : "grid-cols-1",
            )}
          >
            {mergedTimeline.pickups.length > 0 ? (
              <DirectionSection
                headingId="pickups-heading"
                title="Dowóz – rano"
                subtitle="do szkoły"
                tripCount={mergedTimeline.pickups.length}
                icon={Sun}
                iconClassName="fill-amber-400 text-amber-500"
              >
                <TimelineList
                  entries={mergedTimeline.pickups}
                  activePlace={deferredPlace}
                  onSelectPlace={selectPlace}
                  nextTripId={nextMerged?.id}
                />
              </DirectionSection>
            ) : null}

            {mergedTimeline.dropoffs.length > 0 ? (
              <DirectionSection
                headingId="dropoffs-heading"
                title="Odwóz – po lekcjach"
                subtitle="do domu"
                tripCount={mergedTimeline.dropoffs.length}
                icon={Moon}
                iconClassName="text-indigo-400"
              >
                <TimelineList
                  entries={mergedTimeline.dropoffs}
                  activePlace={deferredPlace}
                  onSelectPlace={selectPlace}
                  nextTripId={nextMerged?.id}
                  lessonEnd={planLessonEnd}
                />
              </DirectionSection>
            ) : null}
          </div>

          {mzkRouteReady ? (
            <p className="text-center text-xs text-muted-foreground print:hidden">
              Kursy MZK (pon–pt, dni nauki) i szkolne są w jednej liście wg
              godziny.{" "}
              <Link
                href="/mzk"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Zmień trasę MZK
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div>
          <div
            className={cn(
              "grid items-start gap-4 print:gap-2",
              filtered.pickups.length > 0 &&
                (filtered.dropoffsByDate.length > 0 ||
                  filtered.dropoffsWeekday.length > 0)
                ? "lg:grid-cols-2 print:grid-cols-2"
                : "grid-cols-1",
            )}
          >
            {filtered.pickups.length > 0 ? (
              <DirectionSection
                headingId="pickups-heading"
                title="Dowóz – rano"
                subtitle="do szkoły"
                tripCount={filtered.pickups.reduce(
                  (sum, block) =>
                    sum +
                    block.courses.reduce(
                      (courseSum, course) => courseSum + course.stops.length,
                      0,
                    ),
                  0,
                )}
                icon={Sun}
                iconClassName="fill-amber-400 text-amber-500"
              >
                <div className="space-y-5 print:space-y-3">
                  {filtered.pickups.map((block) => (
                    <article
                      key={`${block.kind}-${block.name}`}
                      className="space-y-2.5"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h3 className="font-display text-base font-semibold text-asphalt">
                          {block.name}
                        </h3>
                        <span className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
                          {block.kind === "vehicle" ? "pojazd" : "kierowca"}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {block.courses.map((course) => (
                          <div
                            key={`${block.name}-${course.label}-${course.note ?? ""}`}
                            className="space-y-2"
                          >
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <p className="text-sm font-medium text-foreground">
                                {course.label}
                              </p>
                              {course.note ? (
                                <p className="text-xs text-muted-foreground">
                                  {course.note}
                                </p>
                              ) : null}
                            </div>
                            <ul className="flex flex-col gap-2 print:gap-1.5">
                              {course.stops.map((stop, index) => {
                                const stopId = stopDomId("pickup", [
                                  block.name,
                                  course.label,
                                  String(index),
                                  stop.time,
                                ]);
                                return (
                                  <StopRow
                                    key={stopId}
                                    stopId={stopId}
                                    stop={stop}
                                    activePlace={deferredPlace}
                                    onSelectPlace={selectPlace}
                                    isNext={nextTrip?.id === stopId}
                                  />
                                );
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </DirectionSection>
            ) : null}

            {filtered.dropoffsByDate.length > 0 ||
            filtered.dropoffsWeekday.length > 0 ? (
              <DirectionSection
                headingId="dropoffs-heading"
                title="Odwóz – po lekcjach"
                subtitle="do domu"
                tripCount={
                  filtered.dropoffsByDate.reduce(
                    (sum, day) => sum + day.runs.length,
                    0,
                  ) +
                  filtered.dropoffsWeekday.reduce(
                    (sum, block) => sum + block.runs.length,
                    0,
                  )
                }
                icon={Moon}
                iconClassName="text-indigo-400"
              >
                <div className="space-y-5 print:space-y-3">
                  {filtered.dropoffsByDate.map((day) => (
                    <article key={day.dateLabel} className="space-y-2.5">
                      <div>
                        <h3 className="font-display text-base font-semibold text-asphalt">
                          {day.dateLabel}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {day.driver}
                        </p>
                      </div>
                      <DropoffRunsList
                        runs={day.runs}
                        lessonEnd={planLessonEnd}
                        activePlace={deferredPlace}
                        onSelectPlace={selectPlace}
                        nextTripId={nextTrip?.id}
                        stopIdFor={(run, index) =>
                          stopDomId("dropoff-date", [
                            day.dateLabel,
                            String(index),
                            run.time,
                          ])
                        }
                      />
                    </article>
                  ))}

                  {filtered.dropoffsWeekday.map((block) => (
                    <article
                      key={`${block.title}-${block.driver}`}
                      className="space-y-2.5"
                    >
                      <div>
                        <h3 className="font-display text-base font-semibold text-asphalt">
                          {block.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {block.driver}
                        </p>
                      </div>
                      <DropoffRunsList
                        runs={block.runs}
                        lessonEnd={planLessonEnd}
                        activePlace={deferredPlace}
                        onSelectPlace={selectPlace}
                        nextTripId={nextTrip?.id}
                        stopIdFor={(run, index) =>
                          stopDomId("dropoff-weekday", [
                            block.driver,
                            String(index),
                            run.time,
                          ])
                        }
                      />
                    </article>
                  ))}
                </div>
              </DirectionSection>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
