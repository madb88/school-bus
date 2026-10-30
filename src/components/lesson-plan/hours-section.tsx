"use client";

import { Bus, Clock, Home, School } from "lucide-react";
import { LessonTimeInput } from "@/components/lesson-plan/field-help-hint";
import { cardClass } from "@/components/lesson-plan/styles";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { dayHasInvalidTimeRange } from "@/lib/child-schedule/match";
import {
  WEEKDAY_OPTIONS,
  type ChildLessonPlan,
  type WeekdayKey,
} from "@/lib/child-schedule/types";
import { cn } from "cn";

function dayTimeSummary(
  day: { start?: string; end?: string } | undefined,
): string {
  if (!day?.start) return "Brak";
  if (!day.end) return `${day.start} – …`;
  return `${day.start} – ${day.end}`;
}

export function HoursSection({
  plan,
  mode,
  hoursSectionInvalid,
  daysMissingEnd,
  daysInvalidEnd,
  saveError,
  onUpdateDay,
  children,
}: {
  plan: ChildLessonPlan;
  mode: "local" | "account";
  hoursSectionInvalid: boolean;
  daysMissingEnd: Array<{ key: WeekdayKey; label: string }>;
  daysInvalidEnd: Array<{ key: WeekdayKey; label: string }>;
  saveError: string | null;
  onUpdateDay: (
    key: WeekdayKey,
    field: "start" | "end",
    value: string,
  ) => void;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        cardClass,
        hoursSectionInvalid && "border-destructive/60",
      )}
    >
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Clock className="size-4 text-bus-deep" aria-hidden />
          Godziny lekcji
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Podaj godziny rozpoczęcia i zakończenia lekcji w poszczególne dni.
        </p>
      </div>

      <Accordion
        multiple
        className={cn(
          "min-w-0 overflow-hidden rounded-xl border md:hidden",
          hoursSectionInvalid
            ? "border-destructive/50"
            : "border-border/60",
        )}
      >
        {WEEKDAY_OPTIONS.map(({ key, label }) => {
          const day = plan.days[key];
          const invalidEnd = dayHasInvalidTimeRange(day?.start, day?.end);
          return (
            <AccordionItem key={key} value={String(key)}>
              <AccordionTrigger className="px-3 py-3.5 font-sans text-base font-medium tracking-normal sm:text-base">
                <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="text-asphalt">{label}</span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums text-sm font-normal",
                      invalidEnd
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {dayTimeSummary(day)}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 px-3 pt-0 pb-4">
                <LessonTimeInput
                  id={`lesson-start-mobile-${key}`}
                  label="Start lekcji"
                  value={day?.start ?? ""}
                  invalid={invalidEnd}
                  onChange={(next) => onUpdateDay(key, "start", next)}
                />
                <LessonTimeInput
                  id={`lesson-end-mobile-${key}`}
                  label="Koniec lekcji"
                  value={day?.end ?? ""}
                  disabled={!day?.start}
                  invalid={invalidEnd}
                  onChange={(next) => onUpdateDay(key, "end", next)}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div
        className={cn(
          "hidden min-w-0 overflow-hidden rounded-xl border md:block",
          hoursSectionInvalid
            ? "border-destructive/50"
            : "border-border/60",
        )}
      >
        <div className="border-b border-border/60 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
          <span>Dzień</span>
          <span>Start lekcji</span>
          <span>Koniec lekcji</span>
        </div>
        <div className="divide-y divide-border/40">
          {WEEKDAY_OPTIONS.map(({ key, label }) => {
            const day = plan.days[key];
            const invalidEnd = dayHasInvalidTimeRange(day?.start, day?.end);
            return (
              <div
                key={key}
                className="grid min-w-0 grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 px-4 py-3"
              >
                <div
                  className={cn(
                    "font-medium",
                    invalidEnd ? "text-destructive" : "text-asphalt",
                  )}
                >
                  {label}
                </div>
                <LessonTimeInput
                  id={`lesson-start-${key}`}
                  label="Start lekcji"
                  value={day?.start ?? ""}
                  invalid={invalidEnd}
                  onChange={(next) => onUpdateDay(key, "start", next)}
                />
                <LessonTimeInput
                  id={`lesson-end-${key}`}
                  label="Koniec lekcji"
                  value={day?.end ?? ""}
                  disabled={!day?.start}
                  invalid={invalidEnd}
                  onChange={(next) => onUpdateDay(key, "end", next)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <Accordion className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
        <AccordionItem value="match-info" className="border-0">
          <AccordionTrigger className="rounded-none px-4 py-4 font-sans text-sm font-semibold tracking-normal hover:bg-muted/50 sm:px-5 sm:text-sm">
            <span className="flex items-center gap-2">
              <Bus className="size-4 text-bus-deep" aria-hidden />
              Jak dobieramy kursy?
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 px-4 pt-0 pb-4 sm:px-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Na podstawie podanych godzin lekcji dopasowujemy odpowiednie
              kursy.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground">
                  <Home className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Dowóz</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Wybieramy kurs przed rozpoczęciem lekcji.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground">
                  <School className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Odwóz</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Wybieramy kurs o godzinie zakończenia lekcji lub późniejszy.
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {daysMissingEnd.length > 0 ||
      daysInvalidEnd.length > 0 ||
      saveError ||
      hoursSectionInvalid ? (
        <div className="space-y-2 text-sm leading-relaxed">
          {daysMissingEnd.length > 0 ? (
            <p className="text-asphalt/80">
              Brak końca lekcji (
              {daysMissingEnd.map((d) => d.label).join(", ")}) — odwozy nie
              dopasują się do planu w te dni
              {mode === "account"
                ? "; dni bez godziny końca nie zapiszą się na koncie"
                : ""}
              .
            </p>
          ) : null}
          {daysInvalidEnd.length > 0 || saveError ? (
            <p className="text-destructive" role="alert">
              {saveError ??
                `Koniec lekcji musi być późniejszy niż start (${daysInvalidEnd.map((d) => d.label).join(", ")}).`}
            </p>
          ) : null}
        </div>
      ) : null}

      {children}
    </section>
  );
}
