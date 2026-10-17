"use client";

import { useState } from "react";
import { Bus, CalendarDays, GraduationCap } from "lucide-react";
import { cn } from "cn";

import { WeekendBusIllustration } from "@/components/weekend-bus-illustration";
import { Button } from "@/components/ui/button";
import { partsFromYmd, type AbsoluteYmd } from "@/lib/dowozy/schedule-dates";

export type WeekendMondayPlanOption = {
  index: number;
  label: string;
  ymd: AbsoluteYmd;
  lessonStart: string;
  busTime: string;
};

type WeekendPlaceholderProps = {
  mondayPlans?: WeekendMondayPlanOption[];
  onViewDay?: (ymd: AbsoluteYmd, planIndex: number) => void;
};

const WEEKDAY_SHORT = [
  "NIE",
  "PON",
  "WTO",
  "ŚRO",
  "CZW",
  "PIĄ",
  "SOB",
] as const;

const MONTH_SHORT = [
  "STY",
  "LUT",
  "MAR",
  "KWI",
  "MAJ",
  "CZE",
  "LIP",
  "SIE",
  "WRZ",
  "PAŹ",
  "LIS",
  "GRU",
] as const;

function DateBadge({ ymd }: { ymd: AbsoluteYmd }) {
  const parts = partsFromYmd(ymd);
  if (!parts) return null;

  const weekday = WEEKDAY_SHORT[parts.weekday] ?? "PON";
  const month = MONTH_SHORT[parts.month] ?? "";

  return (
    <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-[#e8f0fa] px-2 py-3 dark:bg-bus/15">
      <span className="text-[0.65rem] font-semibold tracking-[0.08em] text-bus">
        {weekday}
      </span>
      <span className="mt-0.5 font-display text-2xl font-bold leading-none tracking-tight text-asphalt dark:text-foreground">
        {parts.day}
      </span>
      <span className="mt-1 text-[0.65rem] font-semibold tracking-[0.08em] text-bus">
        {month}
      </span>
    </div>
  );
}

function PlanSwitchPills({
  plans,
  activeIndex,
  onChange,
}: {
  plans: WeekendMondayPlanOption[];
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Plan lekcji"
      className="flex flex-wrap items-center gap-1.5"
    >
      {plans.map((plan) => {
        const active = plan.index === activeIndex;
        return (
          <button
            key={plan.index}
            type="button"
            aria-pressed={active}
            aria-label={`Plan: ${plan.label}`}
            title={plan.label}
            className={cn(
              "max-w-[10rem] truncate rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition-colors",
              "outline-none focus-visible:ring-2 focus-visible:ring-bus/40",
              active
                ? "bg-bus text-bus-foreground"
                : "bg-bus/10 text-bus-deep hover:bg-bus/15 dark:bg-bus/20 dark:text-bus dark:hover:bg-bus/25",
            )}
            onClick={() => onChange(plan.index)}
          >
            {plan.label}
          </button>
        );
      })}
    </div>
  );
}

export function WeekendPlaceholder({
  mondayPlans = [],
  onViewDay,
}: WeekendPlaceholderProps) {
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number | null>(
    null,
  );

  const activePlan =
    mondayPlans.find((plan) => plan.index === selectedPlanIndex) ??
    mondayPlans[0] ??
    null;
  const showPlanSwitch = mondayPlans.length > 1;

  return (
    <div
      className="flex flex-col items-center px-4 py-10 text-center sm:py-14 print:hidden"
      role="status"
    >
      <WeekendBusIllustration />

      <h2 className="mt-8 max-w-lg font-display text-[1.65rem] font-bold tracking-tight text-asphalt sm:mt-10 sm:text-[1.875rem] dark:text-foreground">
        W weekend odpoczywamy
      </h2>
      <div className="mt-3 max-w-md space-y-1 text-base font-normal leading-relaxed text-muted-foreground">
        <p>Autobusy szkolne nie kursują w soboty i niedziele.</p>
        <p>Rozkład wróci w poniedziałek.</p>
      </div>

      {activePlan ? (
        <div className="mt-8 w-full max-w-[min(100%,28rem)] rounded-[28px] border border-[#dce6f4]/80 bg-white p-5 text-left shadow-[0_12px_40px_rgba(43,84,227,0.10)] sm:mt-10 sm:max-w-[500px] sm:p-6 dark:border-border/40 dark:bg-card dark:shadow-[0_10px_28px_rgba(0,0,0,0.5)]">
          {/* Mobile: stacked layout */}
          <div className="flex flex-col gap-5 sm:hidden">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-bus/10 text-bus">
                <CalendarDays className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-display text-base font-semibold tracking-tight text-asphalt dark:text-foreground">
                  Poniedziałek jest już gotowy
                </p>
                <p className="mt-0.5 text-sm font-normal text-muted-foreground">
                  Na podstawie Twojego planu lekcji:
                </p>
                {showPlanSwitch ? (
                  <div className="mt-2.5">
                    <PlanSwitchPills
                      plans={mondayPlans}
                      activeIndex={activePlan.index}
                      onChange={setSelectedPlanIndex}
                    />
                  </div>
                ) : activePlan.label ? (
                  <span className="mt-2 inline-flex max-w-[10rem] truncate rounded-full bg-bus/15 px-2 py-0.5 text-[0.7rem] font-semibold text-bus-deep dark:bg-bus/20 dark:text-bus">
                    {activePlan.label}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bus/10 text-bus">
                <GraduationCap className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Pierwsza lekcja
                </p>
                <p className="mt-0.5 font-display text-xl font-semibold tracking-tight text-asphalt dark:text-foreground">
                  {activePlan.lessonStart}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#F07820]/15 text-[#F07820] dark:bg-[#F07820]/10 dark:text-[#F07820]/85">
                <Bus className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Najbliższy autobus
                </p>
                <p className="mt-0.5 font-display text-xl font-semibold tracking-tight text-asphalt dark:text-foreground">
                  {activePlan.busTime}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop: date badge + side-by-side times */}
          <div className="hidden items-start gap-4 sm:flex">
            <DateBadge ymd={activePlan.ymd} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="font-display text-lg font-semibold tracking-tight text-asphalt dark:text-foreground">
                Poniedziałek jest już gotowy
              </p>
              <p className="mt-1 text-sm font-normal text-muted-foreground">
                Na podstawie Twojego planu lekcji:
              </p>
              {showPlanSwitch ? (
                <div className="mt-2.5">
                  <PlanSwitchPills
                    plans={mondayPlans}
                    activeIndex={activePlan.index}
                    onChange={setSelectedPlanIndex}
                  />
                </div>
              ) : activePlan.label ? (
                <span className="mt-2 inline-flex max-w-[10rem] truncate rounded-full bg-bus/15 px-2 py-0.5 text-[0.7rem] font-semibold text-bus-deep dark:bg-bus/20 dark:text-bus">
                  {activePlan.label}
                </span>
              ) : null}

              <div className="mt-4 flex items-stretch gap-0">
                <div className="flex flex-1 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bus/10 text-bus">
                    <GraduationCap className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Pierwsza lekcja
                    </p>
                    <p className="mt-0.5 font-display text-lg font-semibold tracking-tight text-asphalt dark:text-foreground">
                      {activePlan.lessonStart}
                    </p>
                  </div>
                </div>

                <div
                  className="mx-4 w-px self-stretch bg-border/70 dark:bg-border/40"
                  aria-hidden
                />

                <div className="flex flex-1 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F07820]/15 text-[#F07820] dark:bg-[#F07820]/10 dark:text-[#F07820]/85">
                    <Bus className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Najbliższy autobus
                    </p>
                    <p className="mt-0.5 font-display text-lg font-semibold tracking-tight text-asphalt dark:text-foreground">
                      {activePlan.busTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button
            type="button"
            className="mt-5 h-12 w-full rounded-2xl text-sm font-medium hover:bg-bus-deep"
            onClick={() => onViewDay?.(activePlan.ymd, activePlan.index)}
          >
            Sprawdź poniedziałkowy rozkład →
          </Button>
        </div>
      ) : null}
    </div>
  );
}
