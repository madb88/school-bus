"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, buttonVariants } from "@/components/ui/button";
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
  loadLessonMatchWindow,
  MAX_LESSON_MATCH_WINDOW_MIN,
  MIN_LESSON_MATCH_WINDOW_MIN,
  saveLessonMatchWindow,
} from "@/lib/child-schedule/match-window";
import {
  loadPreferredPlace,
  savePreferredPlace,
} from "@/lib/child-schedule/preferred-place";
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
import { dismissHint, isHintDismissed } from "@/lib/onboarding-hints";
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
        "grid grid-cols-[4.5rem_1fr] gap-3 border-t border-border/50 py-3 first:border-t-0 sm:grid-cols-[5.5rem_1fr] sm:gap-4",
        isNext &&
          "-mx-2 rounded-lg border-t-transparent bg-bus/10 px-2 ring-1 ring-bus/35 sm:-mx-3 sm:px-3",
      )}
    >
      <div className="flex flex-col gap-1">
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
        "grid grid-cols-[4.5rem_1fr] gap-3 border-t border-border/50 py-3 first:border-t-0 sm:grid-cols-[5.5rem_1fr] sm:gap-4",
        isNext &&
          "-mx-2 rounded-lg border-t-transparent bg-mzk/10 px-2 ring-1 ring-mzk/35 sm:-mx-3 sm:px-3",
      )}
    >
      <div className="flex flex-col gap-0.5">
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
          <span className="text-sm text-foreground">
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
        "grid grid-cols-[4.5rem_1fr] gap-3 border-t border-border/50 py-3 first:border-t-0 sm:grid-cols-[5.5rem_1fr] sm:gap-4",
        isNext &&
          "-mx-2 rounded-lg border-t-transparent bg-bus/10 px-2 ring-1 ring-bus/35 sm:-mx-3 sm:px-3",
      )}
    >
      <div className="flex flex-col gap-1">
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
        <div className="flex flex-wrap items-center gap-1.5">
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
    <ul className="rounded-xl border border-border/70 bg-card/90 px-4 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-5">
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

  const [matchLessonPlan, setMatchLessonPlan] = useState(
    initialFilters.matchLessonPlan ?? false,
  );
  const [placeOverride, setPlaceOverride] = useState<string | null | undefined>(
    urlPlaceValid,
  );
  const [direction, setDirection] = useState<ScheduleDirection>(
    initialFilters.direction ?? "all",
  );
  const [sourceMode, setSourceMode] = useState<ScheduleSourceMode>(
    initialFilters.sourceMode ?? "school",
  );
  const [showAllMzkConnections, setShowAllMzkConnections] = useState(false);
  const [lessonMatchWindowMin, setLessonMatchWindowMin] = useState(
    DEFAULT_LESSON_MATCH_WINDOW_MIN,
  );
  const [windowDraft, setWindowDraft] = useState(
    String(DEFAULT_LESSON_MATCH_WINDOW_MIN),
  );
  const [dateFilter, setDateFilter] = useState<ScheduleDateFilter>(
    initialFilters.dateFilter ??
      (initialFilters.matchLessonPlan ? "today" : "all"),
  );
  const [now, setNow] = useState(() => new Date());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [urlReady, setUrlReady] = useState(false);
  const [planHintDismissed, setPlanHintDismissed] = useState(false);
  const [mzkHintDismissed, setMzkHintDismissed] = useState(false);
  const skipUrlWrite = useRef(false);

  useEffect(() => {
    setPlanHintDismissed(isHintDismissed("plan"));
    setMzkHintDismissed(isHintDismissed("mzk"));
  }, []);

  const matchActive = matchLessonPlan && planReady;
  const place =
    placeOverride === undefined
      ? matchActive
        ? lessonPlan.place
        : defaultPlace
      : placeOverride;

  // Seed preferred stop/day, lesson-plan match, and Szkolny+MZK by default.
  useEffect(() => {
    const storedPlan = loadLessonPlan();
    const hasPlan = hasConfiguredLessons(storedPlan);
    const hasMzkRoute = hasConfiguredMzkRoute(loadMzkRoutePreference());

    if (initialFilters.matchLessonPlan === undefined && hasPlan) {
      setMatchLessonPlan(true);
      if (initialFilters.dateFilter === undefined) {
        setDateFilter("today");
      }
    }

    if (initialFilters.sourceMode === undefined && hasMzkRoute) {
      setSourceMode("school-mzk");
    }

    if (!initialFilters.hasExplicit) {
      const storedPlace =
        loadPreferredPlace() ?? storedPlan.place ?? null;
      if (storedPlace && places.includes(storedPlace)) {
        setPlaceOverride(storedPlace);
        setDateFilter("today");
      }
    }

    const storedWindow = loadLessonMatchWindow();
    setLessonMatchWindowMin(storedWindow);
    setWindowDraft(String(storedWindow));

    setUrlReady(true);
    // Seed once after mount; places is stable for a given schedule snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!urlReady) return;
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
    urlReady,
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
        setDateFilter(
          parsed.dateFilter ?? (nextMatch ? "today" : "all"),
        );
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
    dateFilter !== "all" ||
    direction !== "all" ||
    matchActive ||
    sourceMode !== "school";

  const showPlanHint = !planReady && !planHintDismissed;
  const showMzkHint =
    !mzkRouteReady && !mzkHintDismissed && sourceMode === "school-mzk";

  const placeItems = [
    { label: "Wszystkie miejsca", value: null as string | null },
    ...places.map((item) => ({ label: item, value: item })),
  ];

  function persistPlace(next: string | null) {
    savePreferredPlace(next);
  }

  function commitLessonMatchWindow(raw: string) {
    const parsed = Number(raw);
    const next = clampLessonMatchWindow(
      Number.isFinite(parsed) ? parsed : lessonMatchWindowMin,
    );
    setLessonMatchWindowMin(next);
    setWindowDraft(String(next));
    saveLessonMatchWindow(next);
  }

  function enableMatchPlan() {
    startTransition(() => {
      setMatchLessonPlan(true);
      setShowAllMzkConnections(false);
      setPlaceOverride(undefined);
      setDateFilter((current) => (current === "all" ? "today" : current));
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
      setDateFilter("all");
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
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 md:gap-x-3">
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Źródło kursów"
      >
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
      </div>

      <div className="hidden h-5 w-px shrink-0 bg-border md:block" aria-hidden />

      <div className="flex flex-wrap items-center gap-1.5">
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
          <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
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
                value={windowDraft}
                aria-label="Okno dopasowania do planu w minutach"
                onChange={(event) => setWindowDraft(event.target.value)}
                onBlur={() => commitLessonMatchWindow(windowDraft)}
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
          <span className="text-xs text-muted-foreground">
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

      <div className="hidden h-5 w-px shrink-0 bg-border md:block" aria-hidden />

      <div className="flex flex-wrap gap-1" role="group" aria-label="Dzień">
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
      </div>

      <div className="hidden h-5 w-px shrink-0 bg-border md:block" aria-hidden />

      <div className="min-w-0 flex-1 basis-[10rem] md:max-w-[14rem]">
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
            aria-label="Miejsce"
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

      <div
        className="flex flex-wrap gap-1"
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
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="sticky top-0 z-10 ml-[calc(50%-50vw)] w-screen space-y-2 border-y border-border/50 bg-[color-mix(in_srgb,var(--background)_88%,transparent)] py-2 shadow-[0_8px_30px_-18px_color-mix(in_srgb,var(--foreground)_35%,transparent)] backdrop-blur-md md:py-2.5">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:px-6 lg:px-8">
          {/* Mobile: compact bar + shortcuts */}
          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={filtersOpen ? "secondary" : "outline"}
                aria-expanded={filtersOpen}
                aria-controls="schedule-filters-panel"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                Filtry
                <span aria-hidden className="text-muted-foreground">
                  {filtersOpen ? "▴" : "▾"}
                </span>
              </Button>
              <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={dateFilter === "today" ? "secondary" : "outline"}
                  aria-pressed={dateFilter === "today"}
                  onClick={() => {
                    startTransition(() =>
                      setDateFilter((current) =>
                        current === "today" ? "all" : "today",
                      ),
                    );
                  }}
                >
                  Dziś
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    direction === "pickups" ? "secondary" : "outline"
                  }
                  aria-pressed={direction === "pickups"}
                  onClick={() => {
                    startTransition(() =>
                      setDirection((current) =>
                        current === "pickups" ? "all" : "pickups",
                      ),
                    );
                  }}
                >
                  Dowozy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    direction === "dropoffs" ? "secondary" : "outline"
                  }
                  aria-pressed={direction === "dropoffs"}
                  onClick={() => {
                    startTransition(() =>
                      setDirection((current) =>
                        current === "dropoffs" ? "all" : "dropoffs",
                      ),
                    );
                  }}
                >
                  Odwozy
                </Button>
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
          <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 sm:px-6 lg:px-8">
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
                    Wyczyść
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
        <div className="grid gap-3">
          {showPlanHint ? (
            <div className="rounded-xl border border-dashed border-border bg-card/60 px-5 py-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Ustaw plan lekcji</p>
              <p className="mt-1.5 leading-relaxed">
                Dodaj godziny zajęć, żeby uzyskać bardziej spersonalizowany plan
                dojazdu do szkoły — rozkład dopasuje się do rozpoczęcia i
                zakończenia lekcji.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href="/lekcje"
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                >
                  Przejdź do planu lekcji
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    dismissHint("plan");
                    setPlanHintDismissed(true);
                  }}
                >
                  Nie teraz
                </Button>
              </div>
            </div>
          ) : null}
          {showMzkHint ? (
            <div className="rounded-xl border border-dashed border-border bg-card/60 px-5 py-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Ustaw przystanek MZK
              </p>
              <p className="mt-1.5 leading-relaxed">
                Wybierz przystanek wsiadania i wysiadania, żeby zobaczyć kursy
                miejskie w jednej liście ze szkolnymi — spersonalizowany dojazd
                do szkoły.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href="/mzk"
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                >
                  Ustaw trasę MZK
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    dismissHint("mzk");
                    setMzkHintDismissed(true);
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
        <p className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center text-muted-foreground">
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
          {mzkRouteReady &&
          mzkDeparturesCount === 0 &&
          applyLessonFilter &&
          hiddenMzkCount > 0 &&
          !showAllMzkConnections ? (
            <p className="rounded-xl border border-dashed border-border bg-card/60 px-5 py-4 text-sm text-muted-foreground">
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
            <p className="rounded-xl border border-dashed border-border bg-card/60 px-5 py-4 text-sm text-muted-foreground">
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
                    <ul className="rounded-xl border border-border/70 bg-card/90 px-4 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-5">
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
                    <ul className="rounded-xl border border-border/70 bg-card/90 px-4 py-1 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:px-5">
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
