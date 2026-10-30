"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarDays,
  Check,
  Clock,
  Filter,
  FilterX,
  Link2,
  MapPin,
  Printer,
  Settings2,
} from "lucide-react";
import { startTransition, type ReactNode } from "react";
import {
  FilterFieldLabel,
  FilterTimeDisplay,
  filterToggleActiveClass,
} from "@/components/schedule/filter-field";
import { PlaceMultiSelect } from "@/components/schedule/place-multi-select";
import { Button } from "@/components/ui/button";
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
  MAX_LESSON_MATCH_WINDOW_MIN,
  MIN_LESSON_MATCH_WINDOW_MIN,
  saveLessonMatchWindowEnabled,
} from "@/lib/child-schedule/match-window";
import type {
  ScheduleDateFilter,
  ScheduleDirection,
} from "@/lib/dowozy/filter-schedule";
import type { ScheduleSourceMode } from "@/lib/dowozy/filter-url";
import { cn } from "cn";

/** Unique ids for desktop vs mobile sheet — board focus uses these. */
export const LESSON_MATCH_WINDOW_INPUT_ID = "schedule-lesson-match-window";
export const LESSON_MATCH_WINDOW_SHEET_INPUT_ID =
  "schedule-sheet-lesson-match-window";

export type ScheduleFilterSelectItem = {
  label: string;
  value: string;
};

export type ScheduleFiltersProps = {
  filtersStuck: boolean;
  filtersSheetOpen: boolean;
  onFiltersSheetOpenChange: (open: boolean) => void;
  places: string[];
  placesFilter: string[] | null;
  onPlacesChange: (next: string[] | null) => void;
  dateFilter: ScheduleDateFilter;
  onDateFilterChange: (next: ScheduleDateFilter) => void;
  dayPickerItems: ScheduleFilterSelectItem[];
  dayPickerValue: string | null;
  absoluteDateSelected: boolean;
  direction: ScheduleDirection;
  onDirectionChange: (next: ScheduleDirection) => void;
  matchActive: boolean;
  dayTimes: { start?: string | null; end?: string | null } | null;
  lessonMatchWindowEnabled: boolean;
  windowDraftValue: string;
  onWindowDraftChange: (raw: string) => void;
  onWindowCommit: (raw: string) => void;
  isWeekendView: boolean;
  multiPlanAllActive: boolean;
  planReady: boolean;
  target: unknown;
  sourceMode: ScheduleSourceMode;
  sourceItems: Array<{ label: string; value: ScheduleSourceMode }>;
  planItems: ScheduleFilterSelectItem[];
  planSelectValue: string;
  onPlanSelectValue: (next: string) => void;
  onSourceSelectValue: (next: string) => void;
  showMzkPlanToggle: boolean;
  showAllMzkConnections: boolean;
  hiddenMzkCount: number;
  onToggleShowAllMzk: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  copiedFlash: boolean;
  onCopyShareLink: () => void;
  filterSummaryPrimary: ReactNode;
  filterSummarySecondaryParts: string[];
  tripCountLabel: string;
  activeFilterCount: number;
  nextMerged: {
    id: string;
    time: string;
    label: string;
    kind: "pickup" | "dropoff";
  } | null;
};

export function ScheduleFilters({
  filtersStuck,
  filtersSheetOpen,
  onFiltersSheetOpenChange,
  places,
  placesFilter,
  onPlacesChange,
  dateFilter,
  onDateFilterChange,
  dayPickerItems,
  dayPickerValue,
  absoluteDateSelected,
  direction,
  onDirectionChange,
  matchActive,
  dayTimes,
  lessonMatchWindowEnabled,
  windowDraftValue,
  onWindowDraftChange,
  onWindowCommit,
  isWeekendView,
  multiPlanAllActive,
  planReady,
  target,
  sourceMode,
  sourceItems,
  planItems,
  planSelectValue,
  onPlanSelectValue,
  onSourceSelectValue,
  showMzkPlanToggle,
  showAllMzkConnections,
  hiddenMzkCount,
  onToggleShowAllMzk,
  hasActiveFilters,
  onClearFilters,
  copiedFlash,
  onCopyShareLink,
  filterSummaryPrimary,
  filterSummarySecondaryParts,
  tripCountLabel,
  activeFilterCount,
  nextMerged,
}: ScheduleFiltersProps) {
  function renderHoursFilterBody(windowInputId: string) {
    if (matchActive && dayTimes) {
      return (
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
              id={windowInputId}
              type="number"
              inputMode="numeric"
              min={MIN_LESSON_MATCH_WINDOW_MIN}
              max={MAX_LESSON_MATCH_WINDOW_MIN}
              step={5}
              value={windowDraftValue}
              disabled={!lessonMatchWindowEnabled}
              aria-label="Okno dopasowania do planu w minutach"
              onChange={(event) => onWindowDraftChange(event.target.value)}
              onBlur={() => onWindowCommit(windowDraftValue)}
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
      );
    }

    if (matchActive && isWeekendView) {
      return (
        <p className="text-xs text-muted-foreground">
          Weekend — autobusy szkolne nie kursują.
        </p>
      );
    }

    if (matchActive && target && !dayTimes) {
      return multiPlanAllActive ? (
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
      );
    }

    return (
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
        onClick={onToggleShowAllMzk}
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
                onSourceSelectValue(event.target.value);
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
                  onPlanSelectValue(event.target.value);
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
              if (next != null) onSourceSelectValue(next);
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
                onPlanSelectValue(next);
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
                onPlacesChange(next);
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
                    startTransition(() => onDateFilterChange(value));
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
                startTransition(() => onDateFilterChange(next));
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
                  startTransition(() => onDirectionChange(value));
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
            {renderHoursFilterBody(LESSON_MATCH_WINDOW_INPUT_ID)}
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
              void onCopyShareLink();
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
              onClick={onClearFilters}
            >
              <FilterX aria-hidden />
              <span>Wyczyść filtry</span>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

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
              onClick={() => onFiltersSheetOpenChange(true)}
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

        <Sheet open={filtersSheetOpen} onOpenChange={onFiltersSheetOpenChange}>
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
                        onPlacesChange(next);
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
                            startTransition(() => onDateFilterChange(value));
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
                        startTransition(() => onDateFilterChange(next));
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
                          startTransition(() => onDirectionChange(value));
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
                    {renderHoursFilterBody(LESSON_MATCH_WINDOW_SHEET_INPUT_ID)}
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
                        onFiltersSheetOpenChange(false);
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
                        void onCopyShareLink();
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
                  onClick={onClearFilters}
                >
                  <FilterX aria-hidden />
                  <span>Wyczyść filtry</span>
                </Button>
              ) : null}
              <Button
                type="button"
                className="h-12 w-full text-base font-semibold"
                onClick={() => onFiltersSheetOpenChange(false)}
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
  );
}
