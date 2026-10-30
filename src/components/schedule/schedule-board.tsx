"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  Clock,
  Filter,
  FilterX,
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
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { BestTodayWidget } from "@/components/schedule/best-today-widget";
import {
  dateLabel,
  directionLabel,
  formatTripCount,
  sourceModeLabel,
} from "@/components/schedule/labels";
import {
  DirectionEmptyState,
  DirectionSection,
  type DirectionEmptyKind,
} from "@/components/schedule/section";
import { PlaceMultiSelect } from "@/components/schedule/place-multi-select";
import { TimelineList } from "@/components/schedule/trip-rows";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics/events";
import {
  accountPlanLabel,
  fromAccountPlan,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import {
  dropoffFitsLessonEnd,
  formatTimeInput,
  getDayTimes,
  pickupFitsLessonStart,
  timeToMinutes,
} from "@/lib/child-schedule/match";
import {
  clampLessonMatchWindow,
  DEFAULT_LESSON_MATCH_WINDOW_ENABLED,
  DEFAULT_LESSON_MATCH_WINDOW_MIN,
  effectiveLessonMatchWindowMin,
  getLessonMatchWindowEnabledSnapshot,
  getLessonMatchWindowSnapshot,
  MAX_LESSON_MATCH_WINDOW_MIN,
  MIN_LESSON_MATCH_WINDOW_MIN,
  saveLessonMatchWindow,
  saveLessonMatchWindowEnabled,
  subscribeLessonMatchWindow,
  subscribeLessonMatchWindowEnabled,
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
  lessonMatchPlansFromAccount,
  type ScheduleDateFilter,
  type ScheduleDirection,
} from "@/lib/dowozy/filter-schedule";
import {
  filtersHref,
  parseFilterParams,
  serializeFilterParams,
  type PlanMatchFilter,
  type ScheduleSourceMode,
} from "@/lib/dowozy/filter-url";
import {
  buildBestTodayRecommendation,
  detectBestTodayWindowGaps,
} from "@/lib/dowozy/best-today";
import {
  formatDayOptionLabel,
  isAbsoluteDateFilter,
  isSchoolDay,
  listUpcomingSchoolDays,
  partsFromYmd,
  resolveTargetDay,
} from "@/lib/dowozy/schedule-dates";
import type { Schedule } from "@/lib/dowozy/types";
import {
  buildNextMondayPreview,
  listNextMondayPreviews,
} from "@/lib/dowozy/weekend-preview";
import {
  buildMergedTimeline,
  findNextMergedEntry,
} from "@/lib/mzk/merge-timeline";
import {
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import { useMzkOdDepartures } from "@/lib/mzk/use-mzk-od-departures";
import { useMzkRoutePreference } from "@/lib/mzk/use-mzk-route";
import { dismissHint } from "@/lib/onboarding-hints";
import { schoolScopeLabel, siteName } from "@/lib/site-metadata";
import { useHintDismissed } from "@/lib/use-hint-dismissed";
import { cn } from "cn";
import { toast } from "sonner";

type ScheduleBoardProps = {
  schedule: Schedule;
  /** True when MZK snapshot exists on the server (full feed stays off the client). */
  mzkAvailable?: boolean;
  /** Account plans (Plus) for multi-match + badges on `/`. */
  accountPlans?: AccountPlan[];
};

function sanitizeUrlPlaces(
  raw: string[] | null | undefined,
  known: string[],
): string[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const valid = raw.filter((place) => known.includes(place));
  return valid.length > 0 ? valid : null;
}

function uniquePlaces(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

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

export function ScheduleBoard({
  schedule,
  mzkAvailable = false,
  accountPlans = [],
}: ScheduleBoardProps) {
  const places = collectPlaces(schedule);
  const lessonPlan = useLessonPlan();
  const preferredPlace = usePreferredPlace();
  const mzkRoute = useMzkRoutePreference();
  const planReady =
    hasConfiguredLessons(lessonPlan) || accountPlans.length > 0;
  const mzkRouteConfigured = hasConfiguredMzkRoute(mzkRoute);
  const mzkRouteReady = mzkAvailable && mzkRouteConfigured;
  const defaultPlace = preferredPlace ?? lessonPlan.place;
  const accountMatchPlans = useMemo(
    () =>
      accountPlans.length > 0
        ? lessonMatchPlansFromAccount(accountPlans)
        : null,
    [accountPlans],
  );
  const router = useRouter();
  const pathname = usePathname();

  // Wait for localStorage prefs (plan / miejsce / MZK) before painting trips —
  // otherwise SSR empty defaults flash into filtered client content.
  // useSyncExternalStore avoids setState-in-effect (server=false, client=true).
  const prefsReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // URL filters are applied on the client so `/` stays statically renderable
  // (no await searchParams). Keep the spinner up for one extra frame while
  // React commits the URL-derived state (adjust-state-during-render pattern).
  const [urlApplied, setUrlApplied] = useState(false);
  const [planMatchOverride, setPlanMatch] = useState<
    PlanMatchFilter | undefined
  >(undefined);
  const [placesOverride, setPlacesOverride] = useState<
    string[] | null | undefined
  >(undefined);
  const [direction, setDirection] = useState<ScheduleDirection>("all");
  const [sourceModeOverride, setSourceMode] = useState<
    ScheduleSourceMode | undefined
  >(undefined);
  const [showAllMzkConnections, setShowAllMzkConnections] = useState(false);
  const storedWindowRaw = useSyncExternalStore(
    subscribeLessonMatchWindow,
    getLessonMatchWindowSnapshot,
    () => String(DEFAULT_LESSON_MATCH_WINDOW_MIN),
  );
  const storedWindowEnabledRaw = useSyncExternalStore(
    subscribeLessonMatchWindowEnabled,
    getLessonMatchWindowEnabledSnapshot,
    () => (DEFAULT_LESSON_MATCH_WINDOW_ENABLED ? "1" : "0"),
  );
  const lessonMatchWindowMin = clampLessonMatchWindow(Number(storedWindowRaw));
  const lessonMatchWindowEnabled = storedWindowEnabledRaw === "1";
  const effectiveWindowMin = effectiveLessonMatchWindowMin(
    lessonMatchWindowMin,
    lessonMatchWindowEnabled,
  );
  const [windowDraft, setWindowDraft] = useState<string | null>(null);
  const [dateFilterOverride, setDateFilter] = useState<
    ScheduleDateFilter | undefined
  >(undefined);
  const [now, setNow] = useState(() => new Date());
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [filtersStuck, setFiltersStuck] = useState(false);
  const filtersSentinelRef = useRef<HTMLDivElement>(null);
  const planHintDismissed = useHintDismissed("plan");
  const mzkHintDismissed = useHintDismissed("mzk");
  const skipUrlWrite = useRef(false);

  if (prefsReady && !urlApplied) {
    const parsed = parseFilterParams(
      new URLSearchParams(window.location.search),
    );
    setUrlApplied(true);
    setPlanMatch(parsed.planMatch);
    setPlacesOverride(sanitizeUrlPlaces(parsed.places, places));
    setDirection(parsed.direction ?? "all");
    setSourceMode(parsed.sourceMode);
    setDateFilter(parsed.dateFilter);
  }

  const filtersReady = prefsReady && urlApplied;

  const planMatchRaw: PlanMatchFilter =
    planMatchOverride ?? (planReady ? "all" : "off");
  const planMatch: PlanMatchFilter =
    typeof planMatchRaw === "number" &&
    (accountMatchPlans == null ||
      planMatchRaw < 0 ||
      planMatchRaw >= accountMatchPlans.length)
      ? "all"
      : planMatchRaw;
  const sourceMode =
    sourceModeOverride ?? (mzkRouteReady ? "school-mzk" : "school");
  const matchActive = planMatch !== "off" && planReady;
  const activeMatchPlans = useMemo(() => {
    if (!matchActive || !accountMatchPlans?.length) return null;
    if (typeof planMatch === "number") {
      const one = accountMatchPlans[planMatch];
      return one ? [one] : accountMatchPlans;
    }
    return accountMatchPlans;
  }, [matchActive, accountMatchPlans, planMatch]);
  const placesFilter = useMemo(() => {
    if (placesOverride !== undefined) return placesOverride;
    if (matchActive) {
      if (typeof planMatch === "number" && accountMatchPlans?.[planMatch]) {
        return [accountMatchPlans[planMatch]!.place];
      }
      if (accountMatchPlans && accountMatchPlans.length > 0) {
        return uniquePlaces(accountMatchPlans.map((plan) => plan.place));
      }
      return lessonPlan.place ? [lessonPlan.place] : null;
    }
    return defaultPlace ? [defaultPlace] : null;
  }, [
    placesOverride,
    matchActive,
    planMatch,
    accountMatchPlans,
    lessonPlan.place,
    defaultPlace,
  ]);
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

  // Close mobile filters sheet when crossing to desktop layout.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setFiltersSheetOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Keep address bar in sync so filters are shareable.
  useEffect(() => {
    if (skipUrlWrite.current) {
      skipUrlWrite.current = false;
      return;
    }

    const qs = serializeFilterParams({
      places: placesFilter,
      dateFilter,
      direction,
      planMatch,
      sourceMode,
      persistMatchOff: planReady && planMatch === "off",
      persistSourceSchool: mzkRouteReady && sourceMode === "school",
    });
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next === current) return;

    // Offline: Next soft-nav / RSC fetch fails; keep filters in React state
    // and sync the URL locally (Plus users are redirected to `/offline`).
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      window.history.replaceState(window.history.state, "", next);
      return;
    }

    router.replace(next, { scroll: false });
  }, [
    placesFilter,
    dateFilter,
    direction,
    planMatch,
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
        const nextPlanMatch =
          parsed.planMatch ??
          (hasConfiguredLessons(loadLessonPlan()) || accountPlans.length > 0
            ? "all"
            : "off");
        const nextSource =
          parsed.sourceMode ??
          (hasConfiguredMzkRoute(loadMzkRoutePreference())
            ? "school-mzk"
            : "school");
        setPlanMatch(nextPlanMatch);
        setDirection(parsed.direction ?? "all");
        setSourceMode(nextSource);
        setDateFilter(parsed.dateFilter ?? "today");
        setPlacesOverride(sanitizeUrlPlaces(parsed.places, places));
      });
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [places, accountPlans.length]);

  const deferredPlaces = useDeferredValue(placesFilter);
  const deferredDirection = useDeferredValue(direction);
  const deferredDateFilter = useDeferredValue(dateFilter);
  const deferredMatch = useDeferredValue(matchActive);
  const deferredMatchPlans = useDeferredValue(activeMatchPlans);
  const deferredSourceMode = useDeferredValue(sourceMode);
  const deferredWindowMin = useDeferredValue(effectiveWindowMin);

  const includePlanLabels = accountPlans.length > 1;

  const filtered = filterSchedule(schedule, {
    places: deferredPlaces,
    direction: deferredDirection,
    dateFilter: deferredDateFilter,
    lessonPlan,
    matchPlans: deferredMatchPlans,
    matchLessonPlan: deferredMatch,
    lessonMatchWindowMin: deferredWindowMin,
    includePlanLabels,
    now,
  });

  const filteredWithoutWindow =
    deferredMatch &&
    lessonMatchWindowEnabled &&
    Number.isFinite(deferredWindowMin)
      ? filterSchedule(schedule, {
          places: deferredPlaces,
          direction: deferredDirection,
          dateFilter: deferredDateFilter,
          lessonPlan,
          matchPlans: deferredMatchPlans,
          matchLessonPlan: true,
          lessonMatchWindowMin: Number.POSITIVE_INFINITY,
          includePlanLabels,
          now,
        })
      : null;

  const target = resolveTargetDay(deferredDateFilter, now);
  const dayTimes = (() => {
    if (!deferredMatch || !target) return undefined;
    if (typeof planMatch === "number" && accountMatchPlans?.[planMatch]) {
      const plan = accountMatchPlans[planMatch]!;
      return getDayTimes(
        { place: plan.place, days: plan.days },
        target.weekday,
      );
    }
    if (accountMatchPlans && accountMatchPlans.length === 1) {
      const plan = accountMatchPlans[0]!;
      return getDayTimes(
        { place: plan.place, days: plan.days },
        target.weekday,
      );
    }
    if (accountMatchPlans && accountMatchPlans.length > 1) {
      // „Wszystkie” — różne godziny; pojedynczy pasek godzin nie ma sensu.
      return undefined;
    }
    return getDayTimes(lessonPlan, target.weekday);
  })();
  const multiPlanAllActive =
    matchActive &&
    planMatch === "all" &&
    (accountMatchPlans?.length ?? 0) > 1;
  // Separator „Koniec zajęć” tylko przy dopasowaniu do planu.
  const planLessonEnd = dayTimes?.end;
  const anyAccountPlanHasDayTimes =
    Boolean(target) &&
    Boolean(
      accountMatchPlans?.some((plan) =>
        getDayTimes(
          { place: plan.place, days: plan.days },
          target!.weekday,
        ),
      ),
    );
  const planBlocksDay =
    deferredMatch &&
    target !== null &&
    isSchoolDay(target.weekday) &&
    !(dayTimes || (multiPlanAllActive && anyAccountPlanHasDayTimes));

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
  // Jedna oś czasu dla trybu szkolnego i Szkolny+MZK (bez osobnego
  // zagnieżdżonego layoutu „kierowca → kurs → przystanek”).
  const mergedTimeline = buildMergedTimeline({
    schedule: filtered,
    mzkPickups,
    mzkDropoffs,
    direction: deferredDirection,
  });
  const schoolTripCount = countVisibleTrips(filtered);
  const hiddenSchoolCount = filteredWithoutWindow
    ? countVisibleTrips(filteredWithoutWindow) - schoolTripCount
    : 0;
  const tripCount = schoolTripCount + mzkDeparturesCount;
  const schoolEmpty = schoolTripCount === 0;
  const isEmpty = schoolEmpty && mzkDeparturesCount === 0;

  const timelineWithoutWindow = filteredWithoutWindow
    ? buildMergedTimeline({
        schedule: filteredWithoutWindow,
        mzkPickups:
          applyLessonFilter && lessonStart
            ? rawMzkPickups.filter((d) =>
                pickupFitsLessonStart(
                  d.arriveTime,
                  lessonStart,
                  Number.POSITIVE_INFINITY,
                ),
              )
            : mzkPickups,
        mzkDropoffs:
          applyLessonFilter && lessonEnd
            ? rawMzkDropoffs.filter((d) =>
                dropoffFitsLessonEnd(
                  d.departTime,
                  lessonEnd,
                  Number.POSITIVE_INFINITY,
                ),
              )
            : mzkDropoffs,
        direction: deferredDirection,
      })
    : null;
  const pickupHiddenByWindow =
    mergedTimeline.pickups.length === 0 &&
    (timelineWithoutWindow?.pickups.length ?? 0) > 0;
  const dropoffHiddenByWindow =
    mergedTimeline.dropoffs.length === 0 &&
    (timelineWithoutWindow?.dropoffs.length ?? 0) > 0;

  // Baseline: same day, no place / lesson-match — to tell filter empty vs none.
  const baselineFiltered = filterSchedule(schedule, {
    places: null,
    direction: deferredDirection,
    dateFilter: deferredDateFilter,
    lessonPlan,
    matchLessonPlan: false,
    now,
  });
  const baselineTimeline = buildMergedTimeline({
    schedule: baselineFiltered,
    mzkPickups: mzkFetchEnabled ? rawMzkPickups : [],
    mzkDropoffs: mzkFetchEnabled ? rawMzkDropoffs : [],
    direction: deferredDirection,
  });

  function resolveDirectionEmptyKind(
    hasTrips: boolean,
    hiddenByWindow: boolean,
    baselineCount: number,
  ): DirectionEmptyKind | null {
    if (hasTrips) return null;
    if (hiddenByWindow) return "window";
    if (baselineCount > 0) return "filters";
    return "none";
  }

  const pickupEmptyKind = resolveDirectionEmptyKind(
    mergedTimeline.pickups.length > 0,
    pickupHiddenByWindow,
    baselineTimeline.pickups.length,
  );
  const dropoffEmptyKind = resolveDirectionEmptyKind(
    mergedTimeline.dropoffs.length > 0,
    dropoffHiddenByWindow,
    baselineTimeline.dropoffs.length,
  );

  // When „Wszystkie” is selected, keep both direction slots so an empty
  // side (e.g. odwóz ukryty oknem) is still visible as a dashed placeholder.
  const showBothDirectionSlots = deferredDirection === "all";
  const showPickupSection =
    mergedTimeline.pickups.length > 0 ||
    (showBothDirectionSlots && mergedTimeline.dropoffs.length > 0);
  const showDropoffSection =
    mergedTimeline.dropoffs.length > 0 ||
    (showBothDirectionSlots && mergedTimeline.pickups.length > 0);
  const isWeekendView = target !== null && !isSchoolDay(target.weekday);

  const nextMerged =
    deferredDateFilter === "today" && !isEmpty
      ? findNextMergedEntry(mergedTimeline, now)
      : null;

  const hasActiveFilters =
    Boolean(placesFilter?.length) ||
    dateFilter !== "today" ||
    direction !== "all" ||
    matchActive ||
    sourceMode !== "school";

  const activeFilterCount = [
    Boolean(placesFilter?.length),
    dateFilter !== "today",
    direction !== "all",
    matchActive,
    sourceMode !== "school",
  ].filter(Boolean).length;

  const showPlanHint = !planReady && !planHintDismissed;
  const showMzkHint =
    !mzkRouteConfigured && !mzkHintDismissed && sourceMode === "school-mzk";

  const schoolDayOptions = listUpcomingSchoolDays(now, 5);
  const dayPickerItems = schoolDayOptions.map((day) => ({
    label: day.label,
    value: day.ymd,
  }));
  const absoluteDateSelected = isAbsoluteDateFilter(dateFilter);
  if (
    absoluteDateSelected &&
    !dayPickerItems.some((item) => item.value === dateFilter)
  ) {
    const parts = partsFromYmd(dateFilter);
    if (parts) {
      dayPickerItems.push({
        label: formatDayOptionLabel(parts),
        value: dateFilter,
      });
    }
  }
  const dayPickerValue = absoluteDateSelected ? dateFilter : null;

  const singlePlaceForWidgets =
    placesFilter?.length === 1 ? placesFilter[0]! : placesFilter?.[0] ?? null;

  const activeBestTodayPlan =
    typeof planMatch === "number" && accountPlans[planMatch]
      ? accountPlans[planMatch]!
      : accountPlans.length === 1
        ? accountPlans[0]!
        : null;
  const bestTodayLessonPlan = activeBestTodayPlan
    ? fromAccountPlan(activeBestTodayPlan)
    : lessonPlan;
  const bestTodayPlace =
    activeBestTodayPlan?.place ?? singlePlaceForWidgets;

  const multiAccountPlans = accountPlans.length > 1;
  const mondayPlans =
    isWeekendView && matchActive
      ? (() => {
          const previewOpts = {
            windowMin: effectiveWindowMin,
            now,
          };

          if (typeof planMatch === "number" && accountPlans[planMatch]) {
            const preview = buildNextMondayPreview(
              schedule,
              fromAccountPlan(accountPlans[planMatch]!),
              {
                place: accountPlans[planMatch]!.place,
                ...previewOpts,
              },
            );
            if (!preview) return [];
            return [
              {
                index: planMatch,
                label: multiAccountPlans
                  ? accountPlanLabel(accountPlans[planMatch]!, planMatch)
                  : "",
                ymd: preview.ymd,
                lessonStart: preview.lessonStart,
                busTime: preview.busTime,
              },
            ];
          }

          if (accountPlans.length > 0) {
            return listNextMondayPreviews(
              schedule,
              accountPlans.map((plan, index) => ({
                plan: fromAccountPlan(plan),
                label: multiAccountPlans
                  ? accountPlanLabel(plan, index)
                  : undefined,
                index,
              })),
              previewOpts,
            ).map((preview) => ({
              index: preview.planIndex,
              label: multiAccountPlans ? preview.planLabel : "",
              ymd: preview.ymd,
              lessonStart: preview.lessonStart,
              busTime: preview.busTime,
            }));
          }

          const localPreview = buildNextMondayPreview(
            schedule,
            lessonPlan,
            {
              place: lessonPlan.place,
              ...previewOpts,
            },
          );
          if (!localPreview) return [];
          return [
            {
              index: 0,
              label: "",
              ymd: localPreview.ymd,
              lessonStart: localPreview.lessonStart,
              busTime: localPreview.busTime,
            },
          ];
        })()
      : [];

  const bestTodayOptions =
    filtersReady &&
    !isWeekendView &&
    deferredDateFilter !== "all" &&
    deferredMatch &&
    dayTimes
      ? {
          schedule,
          place: bestTodayPlace,
          dateFilter: deferredDateFilter,
          now,
          lessonPlan: bestTodayLessonPlan,
          sourceMode: deferredSourceMode,
          lessonStart: dayTimes.start,
          lessonEnd: dayTimes.end,
          mzkPickups:
            deferredSourceMode === "school-mzk" ? mzkOd.pickups : [],
          mzkDropoffs:
            deferredSourceMode === "school-mzk" ? mzkOd.dropoffs : [],
        }
      : null;

  const showBestTodayWidget =
    filtersReady &&
    !isWeekendView &&
    deferredDateFilter !== "all" &&
    deferredMatch &&
    (Boolean(bestTodayOptions) || accountPlans.length > 1);

  const bestToday = bestTodayOptions
    ? buildBestTodayRecommendation({
        ...bestTodayOptions,
        windowMin: deferredWindowMin,
      })
    : null;

  const bestTodayWithoutWindow =
    bestTodayOptions &&
    lessonMatchWindowEnabled &&
    Number.isFinite(deferredWindowMin)
      ? buildBestTodayRecommendation({
          ...bestTodayOptions,
          windowMin: Number.POSITIVE_INFINITY,
        })
      : null;

  const bestTodayWindowGaps = detectBestTodayWindowGaps(
    bestToday,
    bestTodayWithoutWindow,
  );
  const showBestTodayWindowHint =
    lessonMatchWindowEnabled &&
    (bestTodayWindowGaps.pickup || bestTodayWindowGaps.dropoff);

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

  function openLessonWindowFilters() {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (!isDesktop) setFiltersSheetOpen(true);
    // Wait for the sheet to mount (mobile) before focusing the window input.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const sheet = document.getElementById("schedule-filters-sheet");
        const input = (
          sheet?.querySelector("#schedule-lesson-match-window") ??
          document.getElementById("schedule-lesson-match-window")
        ) as HTMLInputElement | null;
        if (!input || input.disabled) return;
        input.scrollIntoView({ behavior: "smooth", block: "nearest" });
        input.focus();
        input.select();
      });
    });
  }

  function enableMatchPlan(next: PlanMatchFilter = "all") {
    startTransition(() => {
      setPlanMatch(next === "off" ? "all" : next);
      setShowAllMzkConnections(false);
      setPlacesOverride(undefined);
      if (dateFilter === "all") setDateFilter("today");
    });
  }

  function selectPlace(nextPlace: string) {
    startTransition(() => {
      const current = placesFilter;
      if (!current || current.length === 0) {
        setPlacesOverride([nextPlace]);
        persistPlace(nextPlace);
        return;
      }
      if (current.includes(nextPlace)) {
        const next = current.filter((item) => item !== nextPlace);
        setPlacesOverride(next.length > 0 ? next : null);
        persistPlace(next[0] ?? null);
        return;
      }
      const next = [...current, nextPlace];
      setPlacesOverride(next);
      persistPlace(nextPlace);
    });
  }

  function clearFilters() {
    startTransition(() => {
      setPlacesOverride(null);
      persistPlace(null);
      setDateFilter("today");
      setDirection("all");
      setPlanMatch("off");
      setShowAllMzkConnections(false);
      setSourceMode("school");
    });
  }

  async function copyShareLink() {
    const href = filtersHref({
      places: placesFilter,
      dateFilter,
      direction,
      planMatch,
      sourceMode,
    });
    const absolute = new URL(href, window.location.origin).toString();
    const shareNote =
      "Link zawiera filtry rozkładu. Plan lekcji i trasa MZK zostają tylko w tej przeglądarce.";

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: siteName,
          text: shareNote,
          url: absolute,
        });
        trackEvent(AnalyticsEvent.scheduleShareCopied, { method: "share" });
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
      trackEvent(AnalyticsEvent.scheduleShareCopied, { method: "clipboard" });
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
    { label: "Bez planu", value: "off" },
    { label: "Wszystkie", value: "all" },
    ...accountPlans.map((plan, index) => ({
      label: accountPlanLabel(plan, index),
      value: String(index),
    })),
  ];
  const planSelectValue =
    planMatch === "off" || planMatch === "all"
      ? planMatch
      : String(planMatch);

  const showMzkPlanToggle =
    matchActive &&
    sourceMode === "school-mzk" &&
    (hiddenMzkCount > 0 || showAllMzkConnections);

  const hoursFilterBody = matchActive && dayTimes ? (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 max-md:justify-between md:flex-nowrap">
      <div className="inline-flex items-center gap-x-1.5">
        <FilterTimeDisplay value={dayTimes.start} emptyLabel="—" />
        <span className="text-muted-foreground" aria-hidden>
          –
        </span>
        <FilterTimeDisplay value={dayTimes.end} emptyLabel="—" />
      </div>
      <span
        className="hidden h-5 w-px shrink-0 bg-border md:block"
        aria-hidden
      />
      <div className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground max-md:min-w-[8rem] max-md:flex-1 md:shrink">
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            className="size-3.5 shrink-0 accent-bus"
            checked={lessonMatchWindowEnabled}
            aria-label="Ogranicz kursy oknem czasowym"
            onChange={(event) => {
              saveLessonMatchWindowEnabled(event.target.checked);
            }}
          />
          <span>okno</span>
        </label>
        <input
          id="schedule-lesson-match-window"
          type="number"
          inputMode="numeric"
          min={MIN_LESSON_MATCH_WINDOW_MIN}
          max={MAX_LESSON_MATCH_WINDOW_MIN}
          step={5}
          value={windowDraftValue}
          disabled={!lessonMatchWindowEnabled}
          aria-label="Okno dopasowania do planu w minutach"
          onChange={(event) => setWindowDraft(event.target.value)}
          onBlur={() => commitLessonMatchWindow(windowDraftValue)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="h-8 w-12 min-w-0 max-w-full flex-1 rounded-lg border border-border bg-card px-1 text-center text-sm tabular-nums text-foreground outline-hidden focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none"
        />
        <span className="shrink-0">min</span>
      </div>
    </div>
  ) : matchActive && isWeekendView ? (
    <p className="text-xs text-muted-foreground">
      Weekend — autobusy szkolne nie kursują.
    </p>
  ) : matchActive && target && !dayTimes ? (
    multiPlanAllActive ? (
      <p className="text-xs text-muted-foreground">
        Kilka planów — dopasowanie widać przy kursach.
      </p>
    ) : (
      <p className="text-xs text-muted-foreground">
        Brak godzin —{" "}
        <Link
          href="/lekcje"
          className="underline underline-offset-2 hover:text-foreground"
        >
          uzupełnij
        </Link>
      </p>
    )
  ) : (
    <p className="text-xs text-muted-foreground">
      {planReady ? (
        <>Wybierz plan lekcji, żeby dopasować kursy.</>
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

  function applyPlanSelectValue(next: string) {
    if (next === "off") {
      startTransition(() => {
        setPlanMatch("off");
        setShowAllMzkConnections(false);
      });
      return;
    }
    if (next === "all") {
      enableMatchPlan("all");
      return;
    }
    const index = Number.parseInt(next, 10);
    if (Number.isInteger(index) && index >= 0) {
      enableMatchPlan(index);
    }
  }

  function applySourceSelectValue(next: string) {
    if (next === "school" || next === "school-mzk") {
      trackEvent(AnalyticsEvent.scheduleSourceModeChanged, {
        mode: next,
      });
      startTransition(() => setSourceMode(next));
    }
  }

  function renderSourceAndPlanFilters(
    idPrefix: string,
    options?: { stacked?: boolean; largeControls?: boolean },
  ) {
    const stacked = options?.stacked ?? false;
    const largeControls = options?.largeControls ?? false;
    const sourceId = `${idPrefix}-source`;
    const planId = `${idPrefix}-plan`;
    const sourceLabelId = `${idPrefix}-source-filter-label`;
    const planLabelId = `${idPrefix}-lesson-plan-label`;
    const stackedSelectClass = cn(
      "w-full max-w-full",
      largeControls && "[&_select]:h-11 [&_select]:text-base",
    );

    const mzkPlanToggle = showMzkPlanToggle ? (
      <Button
        type="button"
        variant="outline"
        aria-pressed={showAllMzkConnections}
        className={cn(
          stacked && "w-full",
          largeControls && "h-11",
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
    ) : null;

    if (stacked) {
      return (
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-col gap-1">
            <Label
              htmlFor={sourceId}
              className="text-xs text-muted-foreground"
            >
              Autobus
            </Label>
            <NativeSelect
              id={sourceId}
              size={largeControls ? "default" : "sm"}
              className={stackedSelectClass}
              value={sourceMode}
              onChange={(event) => {
                applySourceSelectValue(event.target.value);
              }}
            >
              {sourceItems.map((item) => (
                <NativeSelectOption key={item.value} value={item.value}>
                  {item.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex w-full flex-col gap-1">
            <Label htmlFor={planId} className="text-xs text-muted-foreground">
              Plan lekcji
            </Label>
            {planReady ? (
              <NativeSelect
                id={planId}
                size={largeControls ? "default" : "sm"}
                className={stackedSelectClass}
                value={planSelectValue}
                onChange={(event) => {
                  applyPlanSelectValue(event.target.value);
                }}
              >
                {planItems.map((item) => (
                  <NativeSelectOption key={item.value} value={item.value}>
                    {item.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <Link
                href="/lekcje"
                className={cn(
                  "inline-flex w-full items-center justify-center rounded-lg border border-border bg-card px-2.5 text-sm font-medium hover:bg-muted",
                  largeControls ? "h-11" : "h-8",
                )}
              >
                Ustaw plan
              </Link>
            )}
            {mzkPlanToggle}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1.5">
          <Label id={sourceLabelId} className="text-xs text-muted-foreground">
            Autobus
          </Label>
          <Select
            items={sourceItems}
            value={sourceMode}
            onValueChange={(next) => {
              if (next != null) applySourceSelectValue(next);
            }}
          >
            <SelectTrigger
              aria-labelledby={sourceLabelId}
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
          <Label id={planLabelId} className="text-xs text-muted-foreground">
            Plan lekcji
          </Label>
          {planReady ? (
            <Select
              items={planItems}
              value={planSelectValue}
              onValueChange={(next) => {
                if (next == null) return;
                applyPlanSelectValue(next);
              }}
            >
              <SelectTrigger
                aria-labelledby={planLabelId}
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
          {mzkPlanToggle}
        </div>
      </div>
    );
  }

  const primaryFilters = (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 p-3 sm:p-4 md:flex-row md:items-start md:gap-0 md:divide-x md:divide-border/70">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 md:pr-4">
          <FilterFieldLabel id="schedule-place-filter-label" icon={MapPin}>
            Miejsce
          </FilterFieldLabel>
          <PlaceMultiSelect
            places={places}
            value={placesFilter}
            labelledBy="schedule-place-filter-label"
            onChange={(next) => {
              startTransition(() => {
                setPlacesOverride(next);
                persistPlace(next?.[0] ?? null);
              });
            }}
          />
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 md:px-4">
          <FilterFieldLabel id="schedule-date-filter-label" icon={CalendarDays}>
            Kiedy?
          </FilterFieldLabel>
          <div className="flex flex-wrap items-center gap-1.5">
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
            <Select
              items={dayPickerItems}
              value={dayPickerValue}
              onValueChange={(next) => {
                if (!next) return;
                startTransition(() => setDateFilter(next));
              }}
            >
              <SelectTrigger
                aria-labelledby="schedule-date-filter-label"
                className={cn(
                  "border-border bg-card",
                  absoluteDateSelected && filterToggleActiveClass,
                )}
              >
                <SelectValue placeholder="Wybierz dzień" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {dayPickerItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

      <div className="border-t border-border/60 px-3 py-2.5 sm:px-4">
        {renderSourceAndPlanFilters("schedule")}
      </div>
    </div>
  );

  function renderAdditionalOptions() {
    return (
      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 bg-muted/35 px-3 py-2.5 sm:px-4 lg:justify-between">
        <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground md:inline-flex">
          <Settings2 className="size-3.5 text-bus-deep" aria-hidden />
          Dodatkowe opcje:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="bg-card"
            aria-label="Drukuj"
            onClick={() => {
              trackEvent(AnalyticsEvent.schedulePrintClicked, {
                mode: sourceMode,
              });
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
              className="hidden text-bus-deep hover:bg-bus/10 hover:text-bus-deep md:inline-flex"
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
  }

  const filterSummaryPrimary = (
    <>
      {placesFilter && placesFilter.length > 0 ? (
        <span className="font-medium text-foreground">
          {placesFilter.length === 1
            ? placesFilter[0]
            : `${placesFilter.length} miejsca`}
        </span>
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

  function renderFilterSummaryFooter() {
    return (
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
            <span className="font-semibold text-bus-deep">Najbliższy kurs</span>
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
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="hidden print:block">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {siteName}
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
        className="pointer-events-none mb-0! h-px w-full print:hidden"
      />
      <p className="mb-1.5 text-xs font-medium tracking-tight text-foreground/70 print:hidden">
        {schoolScopeLabel}
      </p>
      <div className="sticky top-0 z-30 -mx-6 isolate [overflow-anchor:none] pb-2 print:hidden sm:-mx-10 md:py-2.5">
        <div
          className={cn(
            "relative overflow-hidden transition-[border-top-left-radius,border-top-right-radius] duration-300 ease-out motion-reduce:transition-none max-md:overflow-visible max-md:border-0 max-md:bg-transparent max-md:shadow-none max-md:rounded-none md:rounded-b-xl md:border md:border-border/70 md:bg-card md:shadow-[0_10px_28px_-18px_color-mix(in_srgb,var(--foreground)_45%,transparent)] md:dark:shadow-[0_8px_22px_-16px_rgba(0,0,0,0.55)] md:rounded-t-xl",
            filtersStuck ? "md:rounded-t-none" : null,
          )}
        >
          {/* Mobile: compact summary + filters sheet trigger */}
          <div className="md:hidden">
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border border-[#DCE4F2] bg-white px-3 py-2 shadow-[0_2px_8px_rgba(40,60,100,0.06)] dark:border-[#2A3548] dark:bg-[#19222d] dark:shadow-[0_2px_8px_rgba(0,0,0,0.25)]",
                filtersStuck && "rounded-t-none",
              )}
            >
              <div className="min-w-0 flex-1">
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
                <span className="inline-flex shrink-0 items-center rounded-full bg-[#E8EDFF] px-2 py-0.5 text-[0.7rem] font-semibold text-[#334A9B] tabular-nums dark:bg-[#243152] dark:text-[#A8B6E8]">
                  {tripCountLabel}
                </span>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-[#C7D2FE] bg-[#E8EDFF] text-[#334A9B] hover:bg-[#E8EDFF] hover:text-[#334A9B] dark:border-[#3A4A6E] dark:bg-[#243152] dark:text-[#A8B6E8] dark:hover:bg-[#243152] dark:hover:text-[#A8B6E8]"
                aria-expanded={filtersSheetOpen}
                aria-controls="schedule-filters-sheet"
                onClick={() => setFiltersSheetOpen(true)}
              >
                <Filter aria-hidden className="size-3.5" />
                Filtry
                {activeFilterCount > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-[#DCE4F2] px-1 text-[0.7rem] font-semibold text-[#334A9B] tabular-nums dark:bg-[#1A2332] dark:text-[#A8B6E8]">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>
          </div>

          <Sheet open={filtersSheetOpen} onOpenChange={setFiltersSheetOpen}>
            <SheetContent
              side="bottom"
              id="schedule-filters-sheet"
              className="max-h-[min(92dvh,100%)] w-full max-w-none gap-0 rounded-t-2xl border-x-0 border-b-0 p-0 data-[side=bottom]:h-auto data-[side=bottom]:max-h-[min(92dvh,100%)]"
            >
              <SheetHeader className="shrink-0 border-b border-border/60 py-3">
                <SheetTitle>Filtry</SheetTitle>
              </SheetHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                <div className="flex w-full flex-col gap-3.5">
                  <div className="flex w-full flex-col gap-1.5">
                    <FilterFieldLabel
                      id="schedule-sheet-place-label"
                      icon={MapPin}
                    >
                      Miejsce
                    </FilterFieldLabel>
                    <PlaceMultiSelect
                      id="schedule-sheet-place"
                      places={places}
                      value={placesFilter}
                      labelledBy="schedule-sheet-place-label"
                      className="h-11 text-base"
                      onChange={(next) => {
                        startTransition(() => {
                          setPlacesOverride(next);
                          persistPlace(next?.[0] ?? null);
                        });
                      }}
                    />
                  </div>

                  <div className="flex w-full flex-col gap-1.5">
                    <FilterFieldLabel
                      id="schedule-sheet-date-label"
                      icon={CalendarDays}
                    >
                      Kiedy?
                    </FilterFieldLabel>
                    <div className="flex w-full items-stretch gap-1.5">
                      <ButtonGroup
                        aria-labelledby="schedule-sheet-date-label"
                        className="shrink-0"
                      >
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
                            className={cn(
                              "h-11 px-3.5",
                              dateFilter === value && filterToggleActiveClass,
                            )}
                            onClick={() => {
                              startTransition(() => setDateFilter(value));
                            }}
                          >
                            {label}
                          </Button>
                        ))}
                      </ButtonGroup>
                      <NativeSelect
                        id="schedule-sheet-date"
                        aria-labelledby="schedule-sheet-date-label"
                        className={cn(
                          "w-full min-w-0 flex-1 [&_select]:h-11 [&_select]:rounded-lg [&_select]:border-border [&_select]:bg-card [&_select]:text-base",
                          absoluteDateSelected &&
                            "[&_select]:border-transparent [&_select]:bg-bus [&_select]:text-bus-foreground [&_select]:dark:bg-bus",
                        )}
                        value={dayPickerValue ?? ""}
                        onChange={(event) => {
                          const next = event.target.value;
                          if (!next) return;
                          startTransition(() => setDateFilter(next));
                        }}
                      >
                        <NativeSelectOption value="" disabled>
                          Wybierz dzień
                        </NativeSelectOption>
                        {dayPickerItems.map((item) => (
                          <NativeSelectOption
                            key={item.value}
                            value={item.value}
                          >
                            {item.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-1.5">
                    <FilterFieldLabel
                      id="schedule-sheet-direction-label"
                      icon={ArrowLeftRight}
                    >
                      Kierunek
                    </FilterFieldLabel>
                    <ButtonGroup
                      aria-labelledby="schedule-sheet-direction-label"
                      className="w-full max-w-none"
                    >
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
                          className={cn(
                            "h-11 min-w-0 flex-1 px-2",
                            direction === value && filterToggleActiveClass,
                          )}
                          onClick={() => {
                            startTransition(() => setDirection(value));
                          }}
                        >
                          {label}
                        </Button>
                      ))}
                    </ButtonGroup>
                  </div>

                  <div className="flex w-full flex-col gap-1.5">
                    <FilterFieldLabel
                      id="schedule-sheet-hours-label"
                      icon={Clock}
                    >
                      Godziny lekcyjne
                    </FilterFieldLabel>
                    <div
                      className="w-full"
                      aria-labelledby="schedule-sheet-hours-label"
                    >
                      {hoursFilterBody}
                    </div>
                  </div>

                  {renderSourceAndPlanFilters("schedule-sheet", {
                    stacked: true,
                    largeControls: true,
                  })}

                  <div className="flex w-full flex-col gap-1.5 border-t border-border/60 pt-3">
                    <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-muted-foreground">
                      <Settings2
                        className="size-3 text-bus-deep"
                        aria-hidden
                      />
                      Dodatkowe opcje
                    </span>
                    <div className="flex w-full gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 min-w-0 flex-1 justify-center bg-card text-xs"
                        aria-label="Drukuj"
                        onClick={() => {
                          trackEvent(AnalyticsEvent.schedulePrintClicked, {
                            mode: sourceMode,
                          });
                          setFiltersSheetOpen(false);
                          window.setTimeout(() => window.print(), 150);
                        }}
                      >
                        <Printer aria-hidden className="size-3.5" />
                        <span>Drukuj</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 min-w-0 flex-1 justify-center bg-card text-xs"
                        aria-label={
                          copiedFlash ? "Skopiowano" : "Kopiuj link"
                        }
                        onClick={() => {
                          void copyShareLink();
                        }}
                      >
                        {copiedFlash ? (
                          <Check aria-hidden className="size-3.5" />
                        ) : (
                          <Link2 aria-hidden className="size-3.5" />
                        )}
                        <span>
                          {copiedFlash ? "Skopiowano" : "Kopiuj link"}
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="shrink-0 gap-1.5 border-t border-border/60 bg-popover pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
                {hasActiveFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full text-bus-deep hover:bg-bus/10 hover:text-bus-deep"
                    aria-label="Wyczyść filtry"
                    onClick={clearFilters}
                  >
                    <FilterX aria-hidden />
                    <span>Wyczyść filtry</span>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="h-12 w-full text-base font-semibold"
                  onClick={() => setFiltersSheetOpen(false)}
                >
                  Pokaż {tripCountLabel}
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {/* Desktop filters — always expanded */}
          <div className="hidden md:block">
            <div id="schedule-filters-panel-desktop">{primaryFilters}</div>
            {renderAdditionalOptions()}
            {renderFilterSummaryFooter()}
          </div>
        </div>
      </div>

      {/* Shared offset under filters so widget and schedule share the same gap. */}
      <div className="-mt-8 flex flex-col gap-5 md:-mt-7">
      {showBestTodayWidget ? (
        <BestTodayWidget
          recommendation={
            bestToday ??
            (dayTimes
              ? {
                  pickup: null,
                  dropoff: null,
                  lessonStart: dayTimes.start
                    ? formatTimeInput(dayTimes.start)
                    : null,
                  lessonEnd: dayTimes.end
                    ? formatTimeInput(dayTimes.end)
                    : null,
                }
              : null)
          }
          dateLabel={dateLabel(deferredDateFilter)}
          sourceMode={sourceMode}
          onSourceModeChange={(next) => {
            startTransition(() => setSourceMode(next));
          }}
          plans={
            accountPlans.length > 1
              ? accountPlans.map((plan, index) => ({
                  label: accountPlanLabel(plan, index),
                  index,
                }))
              : undefined
          }
          activePlanIndex={
            typeof planMatch === "number" ? planMatch : null
          }
          onPlanChange={
            accountPlans.length > 1
              ? (index) => enableMatchPlan(index)
              : undefined
          }
          windowGapHint={
            showBestTodayWindowHint
              ? {
                  windowMin: lessonMatchWindowMin,
                  pickup: bestTodayWindowGaps.pickup,
                  dropoff: bestTodayWindowGaps.dropoff,
                }
              : null
          }
          onOpenWindowFilters={openLessonWindowFilters}
        />
      ) : null}

      {showPlanHint || showMzkHint ? (
        <div className="grid gap-2 print:hidden">
          {showPlanHint ? (
            <div className="rounded-xl border border-border/70 border-l-2 border-l-bus/50 bg-card px-4 py-3 text-sm text-muted-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]">
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
            <div className="rounded-xl border border-border/70 border-l-2 border-l-mzk/50 bg-card px-4 py-3 text-sm text-muted-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]">
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

      {!filtersReady ? (
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
          mondayPlans={mondayPlans}
          onViewDay={(ymd, planIndex) => {
            startTransition(() => {
              setDateFilter(ymd);
              if (multiAccountPlans) {
                setPlanMatch(planIndex);
              } else {
                setPlanMatch("all");
              }
            });
          }}
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
              poza oknem
              {lessonMatchWindowEnabled
                ? ` (±${lessonMatchWindowMin} min)`
                : ""}
              .{" "}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-2 hover:text-mzk-deep"
                onClick={() => {
                  startTransition(() => setShowAllMzkConnections(true));
                }}
              >
                Pokaż wszystkie połączenia MZK
              </button>
              {lessonMatchWindowEnabled ? (
                <>
                  {" "}
                  lub{" "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-bus-deep"
                    onClick={openLessonWindowFilters}
                  >
                    zmień okno w filtrach
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <>
              {hiddenSchoolCount > 0 && lessonMatchWindowEnabled ? (
                <>
                  Brak kursów w oknie czasowym (±{lessonMatchWindowMin} min).
                  Kursy mogą być poza oknem —{" "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-bus-deep"
                    onClick={openLessonWindowFilters}
                  >
                    zmień okno w filtrach
                  </button>
                  .
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
            </>
          )}
        </p>
      ) : (
        <div className="space-y-6">
          {sourceMode === "school-mzk" &&
          mzkRouteReady &&
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
              {lessonMatchWindowEnabled ? (
                <>
                  {" "}
                  lub{" "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-bus-deep"
                    onClick={openLessonWindowFilters}
                  >
                    zmień okno w filtrach
                  </button>
                </>
              ) : null}
            </p>
          ) : null}

          {sourceMode === "school-mzk" &&
          mzkRouteReady &&
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
              showPickupSection && showDropoffSection
                ? "lg:grid-cols-2 print:grid-cols-2"
                : "grid-cols-1",
            )}
          >
            {showPickupSection ? (
              <DirectionSection
                headingId="pickups-heading"
                title="Dowóz – rano"
                subtitle="do szkoły"
                tripCount={mergedTimeline.pickups.length}
                icon={Sun}
                iconClassName={
                  mergedTimeline.pickups.length > 0
                    ? "fill-amber-400 text-amber-500 dark:fill-amber-400/45 dark:text-amber-400/70"
                    : "fill-amber-400/50 text-amber-500/70 dark:fill-amber-400/30 dark:text-amber-400/50"
                }
                className={
                  mergedTimeline.pickups.length === 0
                    ? "print:hidden"
                    : undefined
                }
              >
                {mergedTimeline.pickups.length > 0 ? (
                  <TimelineList
                    entries={mergedTimeline.pickups}
                    activePlaces={deferredPlaces}
                    onSelectPlace={selectPlace}
                    nextTripId={nextMerged?.id}
                  />
                ) : pickupEmptyKind ? (
                  <DirectionEmptyState
                    kind={pickupEmptyKind}
                    windowMin={lessonMatchWindowMin}
                    onChangeWindow={openLessonWindowFilters}
                    onClearFilters={clearFilters}
                  />
                ) : null}
              </DirectionSection>
            ) : null}

            {showDropoffSection ? (
              <DirectionSection
                headingId="dropoffs-heading"
                title="Odwóz – po lekcjach"
                subtitle="do domu"
                tripCount={mergedTimeline.dropoffs.length}
                icon={Moon}
                iconClassName={
                  mergedTimeline.dropoffs.length > 0
                    ? "text-indigo-400 dark:text-bus-deep"
                    : "text-indigo-300 dark:text-bus/50"
                }
                className={
                  mergedTimeline.dropoffs.length === 0
                    ? "print:hidden"
                    : undefined
                }
              >
                {mergedTimeline.dropoffs.length > 0 ? (
                  <TimelineList
                    entries={mergedTimeline.dropoffs}
                    activePlaces={deferredPlaces}
                    onSelectPlace={selectPlace}
                    nextTripId={nextMerged?.id}
                    lessonEnd={planLessonEnd}
                  />
                ) : dropoffEmptyKind ? (
                  <DirectionEmptyState
                    kind={dropoffEmptyKind}
                    windowMin={lessonMatchWindowMin}
                    onChangeWindow={openLessonWindowFilters}
                    onClearFilters={clearFilters}
                  />
                ) : null}
              </DirectionSection>
            ) : null}
          </div>

          {sourceMode === "school-mzk" && mzkRouteReady ? (
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
      )}
      </div>
    </div>
  );
}
