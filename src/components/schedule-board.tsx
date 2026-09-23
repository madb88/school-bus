"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import { findOdDepartures, formatTravelDuration } from "@/lib/mzk/filter-departures";
import {
  buildMergedTimeline,
  findNextMergedEntry,
  type TimelineEntry,
} from "@/lib/mzk/merge-timeline";
import {
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import type { MzkOdDeparture, MzkSchedule } from "@/lib/mzk/types";
import { useMzkRoutePreference } from "@/lib/mzk/use-mzk-route";
import { dismissHint } from "@/lib/onboarding-hints";
import { useHintDismissed } from "@/lib/use-hint-dismissed";
import { cn } from "cn";

type ScheduleBoardProps = {
  schedule: Schedule;
  mzkSchedule?: MzkSchedule | null;
  initialFilters: ParsedFilterParams;
};

function dateLabel(value: ScheduleDateFilter): string {
  if (value === "today") return "Dzisiaj";
  if (value === "tomorrow") return "Jutro";
  return "Wszystkie dni";
}

function directionLabel(value: ScheduleDirection): string {
  if (value === "pickups") return "Dowozy";
  if (value === "dropoffs") return "Odwozy";
  return "Wszystkie";
}

function sourceModeLabel(value: ScheduleSourceMode): string {
  if (value === "school-mzk") return "Szkolny + MZK";
  return "Autobus szkolny";
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
        "inline-flex cursor-pointer! items-center rounded-md px-1.5 py-0.5 text-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        highlight
          ? "bg-foreground/8 font-semibold text-asphalt ring-1 ring-foreground/15 hover:bg-foreground/12"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
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
        "grid grid-cols-[4.5rem_1fr] gap-3 border-l-2 border-border/50 py-3 pl-3 sm:grid-cols-[5.5rem_1fr] sm:gap-4 sm:pl-4",
        isNext && "border-l-bus bg-bus/8 -ml-px rounded-r-lg pr-2",
      )}
    >
      <div className="relative flex flex-col gap-1">
        <span
          aria-hidden
          className={cn(
            "absolute top-2 -left-4.25 size-2 rounded-full bg-border sm:-left-5.25",
            isNext && "bg-bus",
          )}
        />
        <time
          className={cn(
            "font-display text-lg font-bold tabular-nums tracking-tight text-asphalt sm:text-xl",
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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 self-center">
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

  return (
    <li
      id={stopId}
      className={cn(
        "grid grid-cols-[4.5rem_1fr] gap-3 border-l-2 border-mzk/45 bg-mzk/4 py-3 pl-3 sm:grid-cols-[5.5rem_1fr] sm:gap-4 sm:pl-4",
        isNext && "border-l-mzk bg-mzk/12 -ml-px rounded-r-lg pr-2",
      )}
    >
      <div className="relative flex flex-col gap-0.5">
        <span
          aria-hidden
          className={cn(
            "absolute top-2 -left-4.25 size-2 rounded-full bg-mzk sm:-left-5.25",
            isNext && "ring-2 ring-mzk/30",
          )}
        />
        <time
          className={cn(
            "font-display text-lg font-bold tabular-nums tracking-tight text-asphalt sm:text-xl",
            isNext && "text-mzk-deep",
          )}
        >
          {departure.departTime}
        </time>
        <span className="text-xs tabular-nums text-muted-foreground">
          → {departure.arriveTime}
          {duration ? ` · ${duration}` : null}
        </span>
        {isNext ? (
          <span className="text-[0.65rem] font-semibold tracking-[0.12em] text-mzk-deep uppercase">
            Najbliższy
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 self-center">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center rounded-md bg-mzk/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-mzk-deep uppercase">
            MZK {departure.route}
          </span>
          <span className="text-sm font-medium text-foreground">
            {departure.headsign ||
              `${departure.boardStopName} → ${departure.alightStopName}`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {departure.boardStopName} → {departure.alightStopName}
        </p>
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
        "grid grid-cols-[4.5rem_1fr] gap-3 border-l-2 border-bus/45 bg-bus/3 py-3 pl-3 sm:grid-cols-[5.5rem_1fr] sm:gap-4 sm:pl-4",
        isNext && "border-l-bus bg-bus/12 -ml-px rounded-r-lg pr-2",
      )}
    >
      <div className="relative flex flex-col gap-1">
        <span
          aria-hidden
          className={cn(
            "absolute top-2 -left-4.25 size-2 rounded-full bg-bus sm:-left-5.25",
            isNext && "ring-2 ring-bus/30",
          )}
        />
        <time
          className={cn(
            "font-display text-lg font-bold tabular-nums tracking-tight text-asphalt sm:text-xl",
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
      <div className="flex flex-col gap-1.5 self-center">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center rounded-md bg-bus/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-bus-deep uppercase">
            Szkolny
          </span>
          <span className="text-xs text-muted-foreground">{entry.context}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
    </li>
  );
}

function TimelineList({
  entries,
  activePlace,
  onSelectPlace,
  nextTripId,
}: {
  entries: TimelineEntry[];
  activePlace: string | null;
  onSelectPlace: (place: string) => void;
  nextTripId?: string | null;
}) {
  return (
    <ul className="rounded-xl border border-border/70 bg-card/90 px-3 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-4">
      {entries.map((entry, index) => {
        if (entry.kind === "mzk") {
          const id = `mzk-${entry.departure.departTime}-${entry.departure.route}-${index}`;
          return (
            <MzkDepartureRow
              key={id}
              stopId={id}
              departure={entry.departure}
              isNext={nextTripId === id}
            />
          );
        }
        return (
          <SchoolTimelineRow
            key={entry.stopId}
            entry={entry}
            activePlace={activePlace}
            onSelectPlace={onSelectPlace}
            isNext={nextTripId === entry.stopId}
          />
        );
      })}
    </ul>
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
  mzkSchedule = null,
  initialFilters,
}: ScheduleBoardProps) {
  const places = collectPlaces(schedule);
  const lessonPlan = useLessonPlan();
  const preferredPlace = usePreferredPlace();
  const mzkRoute = useMzkRoutePreference();
  const planReady = hasConfiguredLessons(lessonPlan);
  const mzkRouteReady = hasConfiguredMzkRoute(mzkRoute);
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
  const [copiedFlash, setCopiedFlash] = useState(false);
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
  const planBlocksDay =
    deferredMatch &&
    target !== null &&
    isSchoolDay(target.weekday) &&
    !dayTimes;

  const rawMzkPickups =
    deferredSourceMode === "school-mzk" &&
    mzkRouteReady &&
    !planBlocksDay &&
    (deferredDirection === "all" || deferredDirection === "pickups")
      ? findOdDepartures(
          mzkSchedule,
          mzkRoute.boardStopId,
          mzkRoute.alightStopId,
          deferredDateFilter,
          now,
          mzkRoute.route,
        )
      : [];
  const rawMzkDropoffs =
    deferredSourceMode === "school-mzk" &&
    mzkRouteReady &&
    !planBlocksDay &&
    (deferredDirection === "all" || deferredDirection === "dropoffs")
      ? findOdDepartures(
          mzkSchedule,
          mzkRoute.alightStopId,
          mzkRoute.boardStopId,
          deferredDateFilter,
          now,
          mzkRoute.route,
        ).filter((d) => {
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
    !mzkRouteReady && !mzkHintDismissed && sourceMode === "school-mzk";

  const placeItems = [
    { label: "Wszystkie miejsca", value: null as string | null },
    ...places.map((item) => ({ label: item, value: item })),
  ];

  const mobileDateItems = [
    { label: "Wszystkie", value: "all" as const },
    { label: "Dziś", value: "today" as const },
    { label: "Jutro", value: "tomorrow" as const },
  ];

  const mobileDirectionItems = [
    { label: "Wszystkie", value: "all" as const },
    { label: "Dowozy", value: "pickups" as const },
    { label: "Odwozy", value: "dropoffs" as const },
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
    try {
      await navigator.clipboard.writeText(absolute);
      setCopiedFlash(true);
      window.setTimeout(() => setCopiedFlash(false), 2000);
    } catch {
      window.prompt("Skopiuj link:", absolute);
    }
  }

  const filterControls = (
    <div className="flex flex-wrap items-end gap-x-2 gap-y-3 md:gap-x-3">
      <div className="flex shrink-0 flex-col gap-1">
        <Label
          id="schedule-source-filter-label"
          className="text-xs text-muted-foreground"
        >
          Źródło
        </Label>
        <ButtonGroup aria-labelledby="schedule-source-filter-label">
          {(
            [
              ["school", "Szkolny"],
              ["school-mzk", "Szkolny + MZK"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={sourceMode === value ? "secondary" : "outline"}
              aria-pressed={sourceMode === value}
              onClick={() => {
                startTransition(() => setSourceMode(value));
              }}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div
        aria-hidden
        className="mb-1 hidden h-8 w-px shrink-0 bg-border/70 md:block"
      />

      <div className="flex shrink-0 flex-col gap-1">
        <Label
          id="schedule-lesson-plan-label"
          className="text-xs text-muted-foreground"
        >
          Plan lekcji
        </Label>
        <div
          className="flex items-center gap-1.5"
          aria-labelledby="schedule-lesson-plan-label"
        >
          {planReady ? (
            <Button
              type="button"
              size="sm"
              variant={matchActive ? "secondary" : "outline"}
              aria-pressed={matchActive}
              onClick={() => {
                if (matchActive) {
                  startTransition(() => {
                    setMatchLessonPlan(false);
                    setShowAllMzkConnections(false);
                  });
                } else {
                  enableMatchPlan();
                }
              }}
            >
              Do planu lekcji
            </Button>
          ) : (
            <Link
              href="/lekcje"
              className="inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
            >
              Ustaw plan
            </Link>
          )}
          {matchActive &&
          sourceMode === "school-mzk" &&
          (hiddenMzkCount > 0 || showAllMzkConnections) ? (
            <Button
              type="button"
              size="sm"
              variant={showAllMzkConnections ? "secondary" : "outline"}
              aria-pressed={showAllMzkConnections}
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
          {matchActive && dayTimes ? (
            <span className="inline-flex items-center gap-x-1 whitespace-nowrap text-xs text-muted-foreground">
              {dayTimes.start ? <span>od {dayTimes.start}</span> : null}
              {dayTimes.start && dayTimes.end ? <span> </span> : null}
              {dayTimes.end ? <span>do {dayTimes.end}</span> : null}
              <span aria-hidden>·</span>
              <label className="inline-flex items-center gap-1">
                <span>okno ±</span>
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
                  className="h-6 w-12 rounded-md border border-border bg-card px-1.5 text-center tabular-nums text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <span>min</span>
              </label>
            </span>
          ) : null}
          {matchActive && target && !dayTimes ? (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              Brak godzin —{" "}
              <Link
                href="/lekcje"
                className="underline underline-offset-2 hover:text-foreground"
              >
                uzupełnij
              </Link>
            </span>
          ) : null}
        </div>
      </div>

      <div
        aria-hidden
        className="mb-1 hidden h-8 w-px shrink-0 bg-border/70 md:block"
      />

      <div className="flex shrink-0 flex-col gap-1">
        <Label
          id="schedule-date-filter-label"
          className="text-xs text-muted-foreground"
        >
          Dzień
        </Label>
        <ButtonGroup aria-labelledby="schedule-date-filter-label">
          {(
            [
              ["all", "Wszystkie"],
              ["today", "Dziś"],
              ["tomorrow", "Jutro"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={dateFilter === value ? "secondary" : "outline"}
              aria-pressed={dateFilter === value}
              onClick={() => {
                startTransition(() => setDateFilter(value));
              }}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>

      <div className="flex w-44 shrink-0 flex-col gap-1 md:w-52">
        <Label
          id="schedule-place-filter-label"
          className="text-xs text-muted-foreground"
        >
          Miejsce
        </Label>
        <NativeSelect
          size="sm"
          className="w-full max-w-full md:hidden"
          aria-labelledby="schedule-place-filter-label"
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
        <div className="hidden w-full md:block">
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
              size="sm"
              aria-labelledby="schedule-place-filter-label"
              className="w-full max-w-full border-border bg-card text-[0.8rem]"
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
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <Label
          id="schedule-direction-filter-label"
          className="text-xs text-muted-foreground"
        >
          Kierunek
        </Label>
        <ButtonGroup aria-labelledby="schedule-direction-filter-label">
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
              size="sm"
              variant={direction === value ? "secondary" : "outline"}
              aria-pressed={direction === value}
              onClick={() => {
                startTransition(() => setDirection(value));
              }}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="sticky top-0 z-10 -mx-6 space-y-2 border-y border-border/50 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-6 py-2 shadow-[0_8px_24px_-20px_color-mix(in_srgb,var(--foreground)_40%,transparent)] backdrop-blur-md sm:-mx-10 sm:px-10 md:py-2.5">
        <div className="flex flex-col gap-2">
          {/* Mobile: compact bar + day/direction selects */}
          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-end gap-2">
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
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5">
                <div className="flex min-w-0 flex-col gap-1">
                  <Label
                    htmlFor="schedule-mobile-date"
                    className="text-xs text-muted-foreground"
                  >
                    Dzień
                  </Label>
                  <NativeSelect
                    id="schedule-mobile-date"
                    size="sm"
                    className="w-full max-w-full"
                    value={dateFilter}
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
          </div>

          <div
            id="schedule-filters-panel"
            className={cn(
              "flex-col",
              filtersOpen ? "flex" : "hidden",
              "md:flex",
            )}
          >
            {filterControls}
          </div>
        </div>

        {hasActiveFilters || nextTrip || nextMerged ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-xs text-muted-foreground sm:text-sm">
                {matchActive ? "Plan · " : null}
                {sourceMode !== "school" ? (
                  <>
                    {sourceModeLabel(sourceMode)}
                    {" · "}
                  </>
                ) : null}
                {dateLabel(dateFilter)}
                {place ? (
                  <>
                    {" · "}
                    <span className="font-medium text-foreground">{place}</span>
                  </>
                ) : null}
                {direction !== "all" ? (
                  <>
                    {" · "}
                    {directionLabel(direction)}
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
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void copyShareLink();
                  }}
                >
                  {copiedFlash ? "Skopiowano" : "Kopiuj link"}
                </Button>
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Reset
                  </Button>
                ) : null}
              </div>
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
                    document
                      .getElementById(nextMerged.id)
                      ?.scrollIntoView({
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
                    document
                      .getElementById(nextTrip.id)
                      ?.scrollIntoView({
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
            ) : dateFilter === "today" && !isEmpty ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                Brak kolejnych kursów na dziś w tym filtrze.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {showPlanHint || showMzkHint ? (
        <div className="grid gap-2">
          {showPlanHint ? (
            <div className="border-l-2 border-bus/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
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
            <div className="border-l-2 border-mzk/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Ustaw przystanek MZK
              </p>
              <p className="mt-1 leading-relaxed">
                Wybierz wsiadanie i wysiadanie, żeby zobaczyć kursy miejskie
                razem ze szkolnymi.
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

      {isEmpty ? (
        <p className="border-l-2 border-border bg-muted/30 px-4 py-8 text-center text-muted-foreground">
          {sourceMode === "school-mzk" && !mzkRouteReady ? (
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
        <div className="animate-rise-delay-2 space-y-14 animate-in fade-in duration-300">
          {!mzkRouteReady ? (
            <p className="border-l-2 border-mzk/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Dodaj przystanki MZK, żeby zobaczyć też kursy miejskie razem ze
              szkolnymi.{" "}
              <Link
                href="/mzk"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Ustaw trasę
              </Link>
              .
            </p>
          ) : null}

          {mzkRouteReady &&
          mzkDeparturesCount === 0 &&
          applyLessonFilter &&
          hiddenMzkCount > 0 &&
          !showAllMzkConnections ? (
            <p className="border-l-2 border-mzk/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
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
            <p className="border-l-2 border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
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

          {mergedTimeline.pickups.length > 0 ? (
            <section aria-labelledby="pickups-heading">
              <SectionHeading
                id="pickups-heading"
                eyebrow="Rano / do szkoły"
                title="Dowozy"
              />
              <TimelineList
                entries={mergedTimeline.pickups}
                activePlace={deferredPlace}
                onSelectPlace={selectPlace}
                nextTripId={nextMerged?.id}
              />
            </section>
          ) : null}

          {mergedTimeline.dropoffs.length > 0 ? (
            <section aria-labelledby="dropoffs-heading">
              <SectionHeading
                id="dropoffs-heading"
                eyebrow="Po lekcjach / do domu"
                title="Odwozy"
              />
              <TimelineList
                entries={mergedTimeline.dropoffs}
                activePlace={deferredPlace}
                onSelectPlace={selectPlace}
                nextTripId={nextMerged?.id}
              />
            </section>
          ) : null}

          {mzkRouteReady ? (
            <p className="text-xs text-muted-foreground">
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
                    <div className="rounded-xl border border-border/70 bg-card/90 px-3 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-4">
                      {block.courses.map((course, courseIndex) => (
                        <div
                          key={`${block.name}-${course.label}-${course.note ?? ""}`}
                          className={cn(
                            "pb-2",
                            courseIndex > 0 && "border-t border-border/50",
                          )}
                        >
                          <div
                            className={cn(
                              "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-3 pb-0.5",
                              courseIndex === 0 && "pt-2",
                            )}
                          >
                            <p className="text-sm font-medium text-foreground">
                              {course.label}
                            </p>
                            {course.note ? (
                              <p className="text-xs text-muted-foreground">
                                {course.note}
                              </p>
                            ) : null}
                          </div>
                          <ul>
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
                    <ul className="rounded-xl border border-border/70 bg-card/90 px-3 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-4">
                      {day.runs.map((run, index) => {
                        const stopId = stopDomId("dropoff-date", [
                          day.dateLabel,
                          String(index),
                          run.time,
                        ]);
                        return (
                          <StopRow
                            key={stopId}
                            stopId={stopId}
                            stop={run}
                            activePlace={deferredPlace}
                            onSelectPlace={selectPlace}
                            isNext={nextTrip?.id === stopId}
                          />
                        );
                      })}
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
                    <ul className="rounded-xl border border-border/70 bg-card/90 px-3 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-4">
                      {block.runs.map((run, index) => {
                        const stopId = stopDomId("dropoff-weekday", [
                          block.driver,
                          String(index),
                          run.time,
                        ]);
                        return (
                          <StopRow
                            key={stopId}
                            stopId={stopId}
                            stop={run}
                            activePlace={deferredPlace}
                            onSelectPlace={selectPlace}
                            isNext={nextTrip?.id === stopId}
                          />
                        );
                      })}
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
