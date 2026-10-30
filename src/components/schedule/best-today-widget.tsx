"use client";

import { ChevronDown, CircleHelp, Moon, Sparkles, Sun } from "lucide-react";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  BestTodayRecommendation,
  BestTodayTrip,
} from "@/lib/dowozy/best-today";
import type { ScheduleSourceMode } from "@/lib/dowozy/filter-url";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";

const BEST_CONNECTION_HELP =
  "Wybieramy kursy pasujące do planu lekcji w oknie dopasowania: do szkoły — najpóźniejszy, który jeszcze zdąży przed startem zajęć; ze szkoły — najwcześniejszy po ich końcu. Źródło (szkolny / szkolny + MZK) bierzesz z przełącznika w tym widgecie.";

export type BestTodayPlanOption = {
  label: string;
  index: number;
};

type BestTodayWidgetProps = {
  recommendation: BestTodayRecommendation | null;
  /** Pill next to the title — mirrors the active date filter (Dziś / Jutro / …). */
  dateLabel: string;
  sourceMode: ScheduleSourceMode;
  onSourceModeChange: (mode: ScheduleSourceMode) => void;
  /** Account plans (2+) — click switches the active plan on the board. */
  plans?: BestTodayPlanOption[];
  activePlanIndex?: number | null;
  onPlanChange?: (index: number) => void;
  /** Shown when a direction is empty only because the lesson match window is tight. */
  windowGapHint?: {
    windowMin: number;
    pickup: boolean;
    dropoff: boolean;
  } | null;
  onOpenWindowFilters?: () => void;
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

/** Short label for the widget — full route details live in the schedule below. */
function compactTripLabel(trip: BestTodayTrip): string {
  if (trip.source === "school") return trip.label;

  const parts = trip.label.split("→").map((part) => part.trim());
  if (parts.length === 2) {
    return trip.direction === "pickup" ? parts[0]! : parts[1]!;
  }
  return trip.label;
}

function TripCard({
  title,
  direction,
  trip,
}: {
  title: string;
  direction: "pickup" | "dropoff";
  trip: BestTodayTrip | null;
}) {
  const Icon = direction === "pickup" ? Sun : Moon;

  if (!trip) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/25 px-2.5 lg:h-11 lg:px-3 dark:bg-muted/15">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            direction === "pickup"
              ? "fill-amber-400/50 text-amber-500/70 dark:fill-amber-400/30 dark:text-amber-400/50"
              : "text-indigo-300 dark:text-bus/50",
          )}
          aria-hidden
        />
        <span className="min-w-0 truncate text-[12px] font-medium text-muted-foreground">
          {title}
        </span>
        <span className="ml-auto text-sm text-muted-foreground">Brak</span>
      </div>
    );
  }

  const isMzk = trip.source === "mzk";

  return (
    <button
      type="button"
      onClick={() => scrollToTrip(trip.id)}
      className={cn(
        "group flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border px-2.5 text-left outline-none transition-colors lg:h-11 lg:gap-2.5 lg:px-3",
        "focus-visible:ring-2 focus-visible:ring-bus/40",
        isMzk
          ? "border-mzk/25 bg-mzk/[0.07] hover:bg-mzk/[0.11] dark:border-mzk/30 dark:bg-mzk/[0.09] dark:hover:bg-mzk/[0.14]"
          : "border-bus/25 bg-bus/[0.07] hover:bg-bus/[0.11] dark:border-bus/30 dark:bg-bus/[0.09] dark:hover:bg-bus/[0.14]",
      )}
    >
      <Icon
        className={cn(
          "size-3.5 shrink-0",
          direction === "pickup"
            ? "fill-amber-400 text-amber-500 dark:fill-amber-400/45 dark:text-amber-400/70"
            : "text-indigo-400 dark:text-bus",
        )}
        aria-hidden
      />

      <span
        className={cn(
          "shrink-0 font-display text-[1.375rem] font-bold leading-none tracking-tight tabular-nums lg:text-[1.5rem]",
          isMzk ? "text-mzk-deep" : "text-asphalt dark:text-foreground",
        )}
      >
        {trip.time}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[12px] font-medium text-muted-foreground">
            {title}
          </span>
          <span
            className={cn(
              "shrink-0 rounded px-1 py-px text-[0.6rem] font-semibold tracking-wide uppercase",
              isMzk ? "bg-mzk/15 text-mzk-deep" : "bg-bus/15 text-bus-deep",
            )}
          >
            {tripKindLabel(trip)}
          </span>
        </div>
        <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground group-hover:text-foreground/80 lg:text-[12px]">
          {compactTripLabel(trip)}
        </span>
      </div>
    </button>
  );
}

function SourcePills({
  sourceMode,
  onSourceModeChange,
  className,
}: {
  sourceMode: ScheduleSourceMode;
  onSourceModeChange: (mode: ScheduleSourceMode) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Źródło połączeń"
      className={cn(
        "flex w-full rounded-full bg-muted/70 p-0.5 md:inline-flex md:w-auto dark:bg-muted/40",
        className,
      )}
    >
      {(
        [
          { value: "school", label: "Szkolny", shortLabel: "Szkolny" },
          {
            value: "school-mzk",
            label: "Szkolny + MZK",
            shortLabel: "+ MZK",
          },
        ] as const
      ).map((option) => {
        const active = sourceMode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={option.label}
            title={option.label}
            className={cn(
              "min-w-0 flex-1 truncate rounded-full px-3 py-1.5 text-[0.7rem] font-semibold transition-colors md:flex-none md:px-2 md:py-0.5 md:text-[0.65rem]",
              active
                ? "bg-bus text-bus-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onSourceModeChange(option.value)}
          >
            <span className="md:hidden">{option.shortLabel}</span>
            <span className="hidden md:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const planPillBaseClass =
  "min-w-0 max-w-full truncate rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50";

function planPillToneClass(active: boolean) {
  return active
    ? "bg-amber-400/20 text-amber-900 ring-1 ring-amber-500/40 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-400/35"
    : "bg-amber-400/10 text-amber-900/55 hover:bg-amber-400/20 hover:text-amber-900 dark:bg-amber-400/10 dark:text-amber-200/55 dark:hover:bg-amber-400/15 dark:hover:text-amber-200";
}

function PlanPillButton({
  plan,
  active,
  onPlanChange,
}: {
  plan: BestTodayPlanOption;
  active: boolean;
  onPlanChange: (index: number) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`Plan: ${plan.label}`}
      title={plan.label}
      className={cn(
        planPillBaseClass,
        "h-full min-w-0 flex-1",
        planPillToneClass(active),
      )}
      onClick={() => onPlanChange(plan.index)}
    >
      {plan.label}
    </button>
  );
}

function PlanPills({
  plans,
  activePlanIndex,
  onPlanChange,
  className,
}: {
  plans: BestTodayPlanOption[];
  activePlanIndex: number | null;
  onPlanChange: (index: number) => void;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const measure = measureRef.current;
    if (!host || !measure) return;

    const update = () => {
      setCollapsed(measure.scrollWidth > host.clientWidth + 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [plans]);

  const activePlan =
    plans.find((plan) => plan.index === activePlanIndex) ?? plans[0] ?? null;

  let visible: ReactNode;
  if (collapsed && activePlan) {
    visible = (
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          type="button"
          aria-label={`Plan lekcji: ${activePlan.label}. Pokaż listę planów.`}
          title={activePlan.label}
          className={cn(
            planPillBaseClass,
            "inline-flex h-7 w-full max-w-full items-center justify-between gap-0.5",
            planPillToneClass(true),
          )}
        >
          <span className="min-w-0 truncate">{activePlan.label}</span>
          <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden />
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          sideOffset={6}
          className="w-auto min-w-[9rem] max-w-[min(16rem,calc(100vw-2rem))] gap-1 p-1.5"
        >
          <div role="listbox" aria-label="Plan lekcji" className="flex flex-col gap-0.5">
            {plans.map((plan) => {
              const active = activePlanIndex === plan.index;
              return (
                <button
                  key={plan.index}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors",
                    "outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
                    active
                      ? "bg-amber-400/20 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
                      : "text-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    onPlanChange(plan.index);
                    setMenuOpen(false);
                  }}
                >
                  {plan.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  } else {
    visible = (
      <div
        role="group"
        aria-label="Plan lekcji"
        className="flex h-7 w-full flex-nowrap items-center gap-1"
      >
        {plans.map((plan) => (
          <PlanPillButton
            key={plan.index}
            plan={plan}
            active={activePlanIndex === plan.index}
            onPlanChange={onPlanChange}
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={hostRef} className={cn("relative min-w-0", className)}>
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 flex flex-nowrap gap-1 opacity-0"
      >
        {plans.map((plan) => (
          <span
            key={plan.index}
            className={cn(planPillBaseClass, planPillToneClass(false))}
          >
            {plan.label}
          </span>
        ))}
      </div>
      {visible}
    </div>
  );
}

export function BestTodayWidget({
  recommendation,
  dateLabel,
  sourceMode,
  onSourceModeChange,
  plans = [],
  activePlanIndex = null,
  onPlanChange,
  windowGapHint = null,
  onOpenWindowFilters,
}: BestTodayWidgetProps) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const showPlanPills = plans.length > 1 && Boolean(onPlanChange);
  const showWindowGapHint = Boolean(
    recommendation &&
      windowGapHint &&
      (windowGapHint.pickup || windowGapHint.dropoff),
  );

  return (
    <section
      aria-labelledby="best-today-heading"
      className="-mx-6 w-auto min-w-0 rounded-none border border-border/60 border-x-0 bg-card px-3 py-1.5 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] print:hidden sm:-mx-10 sm:px-3.5 lg:mx-0 lg:rounded-2xl lg:border-x dark:border-border/40 dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]"
    >
      <div className="flex flex-col gap-1.5">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={
            expanded
              ? "Zwiń najlepsze połączenia"
              : "Rozwiń najlepsze połączenia"
          }
          className="flex min-h-7 cursor-pointer items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-bus/40"
          onClick={() => setExpanded((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setExpanded((current) => !current);
            }
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1 md:flex-none md:shrink">
            <Sparkles className="size-3 shrink-0 text-bus" aria-hidden />
            <h2
              id="best-today-heading"
              className="truncate font-display text-[0.8125rem] font-semibold tracking-tight text-asphalt dark:text-foreground"
            >
              Najlepsze połączenia
            </h2>
          </div>

          {expanded ? (
            <div
              className="hidden min-w-0 flex-1 items-center justify-end gap-1.5 md:flex"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <span className="inline-flex h-7 max-w-[12rem] shrink-0 items-center truncate rounded-full bg-bus px-1.5 text-[0.65rem] font-semibold tracking-wide text-bus-foreground">
                {dateLabel}
              </span>
              {showPlanPills ? (
                <PlanPills
                  plans={plans}
                  activePlanIndex={activePlanIndex}
                  onPlanChange={onPlanChange!}
                  className="min-w-0 max-w-[18rem]"
                />
              ) : null}
              <SourcePills
                sourceMode={sourceMode}
                onSourceModeChange={onSourceModeChange}
              />
            </div>
          ) : null}

          <div
            className="flex shrink-0 items-center gap-0.5"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Popover>
              <PopoverTrigger
                type="button"
                aria-label="Jak wybieramy najlepsze połączenie"
                className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-bus/40 aria-expanded:text-foreground"
              >
                <CircleHelp className="size-3.5" aria-hidden />
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={6}
                className="w-[min(18rem,calc(100vw-2rem))] gap-1 p-3"
              >
                <PopoverHeader>
                  <PopoverTitle className="text-xs font-semibold">
                    Jak wybieramy połączenie
                  </PopoverTitle>
                  <PopoverDescription className="text-xs leading-snug">
                    {BEST_CONNECTION_HELP}
                  </PopoverDescription>
                </PopoverHeader>
              </PopoverContent>
            </Popover>
          </div>

          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </div>

        <div id={panelId} hidden={!expanded} className="flex flex-col gap-1.5">
          <div
            className={cn(
              "grid min-w-0 w-full gap-2 md:hidden",
              showPlanPills ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            {showPlanPills ? (
              <PlanPills
                plans={plans}
                activePlanIndex={activePlanIndex}
                onPlanChange={onPlanChange!}
                className="min-w-0 w-full"
              />
            ) : null}
            <SourcePills
              sourceMode={sourceMode}
              onSourceModeChange={onSourceModeChange}
            />
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-1 lg:grid-cols-2 lg:gap-2">
            {recommendation ? (
              <>
                <TripCard
                  title="Do szkoły"
                  direction="pickup"
                  trip={recommendation.pickup}
                />
                <TripCard
                  title="Ze szkoły"
                  direction="dropoff"
                  trip={recommendation.dropoff}
                />
                {showWindowGapHint && windowGapHint ? (
                  <p className="text-xs leading-snug text-muted-foreground lg:col-span-2">
                    Kursy mogą być poza oknem (±{windowGapHint.windowMin} min).{" "}
                    {onOpenWindowFilters ? (
                      <button
                        type="button"
                        className="font-medium text-foreground underline underline-offset-2 hover:text-bus-deep"
                        onClick={onOpenWindowFilters}
                      >
                        Zmień okno w filtrach
                      </button>
                    ) : null}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-xs leading-snug text-muted-foreground lg:col-span-2">
                {activePlanIndex == null
                  ? "Wybierz plan, żeby zobaczyć najlepsze połączenie."
                  : "Brak dopasowanego połączenia dla tego planu."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
