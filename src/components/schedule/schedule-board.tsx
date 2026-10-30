"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Moon, Sun } from "lucide-react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { BestTodayWidget } from "@/components/schedule/best-today-widget";
import { ScheduleFilters } from "@/components/schedule/schedule-filters";
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
import { TimelineList } from "@/components/schedule/trip-rows";
import { WeekendPlaceholder } from "@/components/weekend-placeholder";
import { Button, buttonVariants } from "@/components/ui/button";
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
  saveLessonMatchWindow,
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
  ].filter((part): part is string => Boolean(part));

  const tripCountLabel = formatTripCount(tripCount);

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
      <ScheduleFilters
        filtersStuck={filtersStuck}
        filtersSheetOpen={filtersSheetOpen}
        onFiltersSheetOpenChange={setFiltersSheetOpen}
        places={places}
        placesFilter={placesFilter ?? null}
        onPlacesChange={(next) => {
          setPlacesOverride(next);
          persistPlace(next?.[0] ?? null);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        dayPickerItems={dayPickerItems}
        dayPickerValue={dayPickerValue}
        absoluteDateSelected={absoluteDateSelected}
        direction={direction}
        onDirectionChange={setDirection}
        matchActive={matchActive}
        dayTimes={dayTimes ?? null}
        lessonMatchWindowEnabled={lessonMatchWindowEnabled}
        windowDraftValue={windowDraftValue}
        onWindowDraftChange={setWindowDraft}
        onWindowCommit={commitLessonMatchWindow}
        isWeekendView={isWeekendView}
        multiPlanAllActive={multiPlanAllActive}
        planReady={planReady}
        target={target}
        sourceMode={sourceMode}
        sourceItems={sourceItems}
        planItems={planItems}
        planSelectValue={planSelectValue}
        onPlanSelectValue={applyPlanSelectValue}
        onSourceSelectValue={applySourceSelectValue}
        showMzkPlanToggle={showMzkPlanToggle}
        showAllMzkConnections={showAllMzkConnections}
        hiddenMzkCount={hiddenMzkCount}
        onToggleShowAllMzk={() => {
          startTransition(() =>
            setShowAllMzkConnections((current) => !current),
          );
        }}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
        copiedFlash={copiedFlash}
        onCopyShareLink={copyShareLink}
        filterSummaryPrimary={filterSummaryPrimary}
        filterSummarySecondaryParts={filterSummarySecondaryParts}
        tripCountLabel={tripCountLabel}
        activeFilterCount={activeFilterCount}
        nextMerged={nextMerged}
      />

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
