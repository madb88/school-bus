"use client";

import Link from "next/link";
import { Bus, Clock, Home, MapPin, Printer, School } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  LessonPlanPrint,
  type LessonPlanPrintMode,
} from "@/components/lesson-plan-print";
import { PlaceCombobox } from "@/components/place-combobox";
import { SettingsTransferSheet } from "@/components/settings-transfer-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  clearLessonPlan,
  hasConfiguredLessons,
  saveLessonPlan,
} from "@/lib/child-schedule/storage";
import { formatTimeInput, timeToMinutes } from "@/lib/child-schedule/match";
import { savePreferredPlace } from "@/lib/child-schedule/preferred-place";
import {
  EMPTY_LESSON_PLAN,
  WEEKDAY_OPTIONS,
  type ChildLessonPlan,
  type WeekdayKey,
} from "@/lib/child-schedule/types";
import { filtersHref } from "@/lib/dowozy/filter-url";
import type { Schedule } from "@/lib/dowozy/types";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import { hasConfiguredMzkRoute } from "@/lib/mzk/route-storage";
import type { MzkSchedule } from "@/lib/mzk/types";
import { useMzkRoutePreference } from "@/lib/mzk/use-mzk-route";
import { syncStoredPushPlan } from "@/lib/push/browser";

const cardClass =
  "space-y-5 rounded-xl border border-border/70 bg-card/90 p-4 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:p-6";

const actionButtonClass = "h-11 w-full px-4 sm:w-auto";

type LessonPlanFormProps = {
  places: string[];
  schedule: Schedule;
  mzkSchedule: MzkSchedule | null;
};

function dayHasEndBeforeStart(
  start: string | undefined,
  end: string | undefined,
): boolean {
  if (!start || !end) return false;
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin === null || endMin === null) return false;
  return endMin < startMin;
}

function LessonTimeInput({
  id,
  label,
  value,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium tracking-wide text-muted-foreground uppercase md:sr-only"
      >
        {label}
      </Label>
      <Input
        id={id}
        type="time"
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full bg-background tabular-nums md:h-10"
      />
    </div>
  );
}

export function LessonPlanForm({
  places,
  schedule,
  mzkSchedule,
}: LessonPlanFormProps) {
  const stored = useLessonPlan();
  const mzkRoute = useMzkRoutePreference();
  const [draft, setDraft] = useState<ChildLessonPlan | null>(null);
  const plan = draft ?? stored;
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [printMode, setPrintMode] = useState<LessonPlanPrintMode>("school");

  const daysMissingEnd = WEEKDAY_OPTIONS.filter(({ key }) => {
    const day = plan.days[key];
    return Boolean(day?.start && !day.end);
  });
  const daysInvalidEnd = WEEKDAY_OPTIONS.filter(({ key }) => {
    const day = plan.days[key];
    return dayHasEndBeforeStart(day?.start, day?.end);
  });

  function updateDay(
    key: WeekdayKey,
    field: "start" | "end",
    value: string,
  ) {
    setSaveError(null);
    setDraft((prev) => {
      const base = prev ?? stored;
      const nextDays = { ...base.days };
      const current = nextDays[key] ?? { start: "" };

      if (field === "start") {
        if (!value) {
          delete nextDays[key];
        } else {
          nextDays[key] = {
            start: value,
            ...(current.end ? { end: current.end } : {}),
          };
        }
      } else {
        if (!current.start) return base;
        if (!value) {
          nextDays[key] = { start: current.start };
        } else {
          nextDays[key] = { start: current.start, end: value };
        }
      }

      return { ...base, days: nextDays };
    });
  }

  function handleSave() {
    startTransition(() => {
      const source = draft ?? stored;

      for (const { key, label } of WEEKDAY_OPTIONS) {
        const day = source.days[key];
        if (!day?.start || !day.end) continue;
        if (dayHasEndBeforeStart(day.start, day.end)) {
          const message = `${label}: koniec lekcji nie może być wcześniejszy niż start.`;
          setSaveError(message);
          toast.error(message);
          return;
        }
      }

      const normalized: ChildLessonPlan = {
        place: source.place,
        days: {},
      };

      for (const [key, day] of Object.entries(source.days)) {
        if (!day?.start) continue;
        normalized.days[Number(key) as WeekdayKey] = {
          start: formatTimeInput(day.start),
          ...(day.end ? { end: formatTimeInput(day.end) } : {}),
        };
      }

      saveLessonPlan(normalized);
      if (normalized.place) {
        savePreferredPlace(normalized.place);
      }
      void syncStoredPushPlan(normalized);
      setDraft(null);
      setSaveError(null);

      const missingEnd = WEEKDAY_OPTIONS.filter(({ key }) => {
        const day = normalized.days[key];
        return Boolean(day?.start && !day.end);
      });
      if (missingEnd.length > 0) {
        toast.success("Plan lekcji zapisany", {
          description:
            "Bez godziny końca odwozy nie dopasują się do planu — uzupełnij koniec lekcji, gdy znasz godzinę.",
        });
      } else {
        toast.success("Plan lekcji zapisany");
      }
    });
  }

  function handleClear() {
    const cleared = { ...EMPTY_LESSON_PLAN, days: {} };
    clearLessonPlan();
    setDraft(cleared);
    setSaveError(null);
    void syncStoredPushPlan(cleared);
  }

  function setPlace(next: string | null) {
    setSaveError(null);
    setDraft((prev) => ({
      ...(prev ?? stored),
      place: next,
    }));
  }

  const canPrint = Boolean(plan.place) && hasConfiguredLessons(plan);
  const canPrintMzk =
    canPrint && Boolean(mzkSchedule) && hasConfiguredMzkRoute(mzkRoute);
  const selectedPrintReady = printMode === "school-mzk" ? canPrintMzk : canPrint;

  useEffect(() => {
    function clearPrintMode() {
      delete document.body.dataset.printMode;
    }
    window.addEventListener("afterprint", clearPrintMode);
    return () => window.removeEventListener("afterprint", clearPrintMode);
  }, []);

  function handlePrint(mode: LessonPlanPrintMode) {
    document.body.dataset.printMode = mode;
    window.print();
  }

  return (
    <>
      <div className="space-y-6 print:hidden">
        <section className={cardClass}>
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MapPin className="size-4 text-bus-deep" aria-hidden />
              Przystanek
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Wybierz przystanek, z którego dziecko jedzie do szkoły.
            </p>
          </div>
          <div className="flex w-full min-w-0 max-w-md flex-col gap-1.5">
            <Label id="lesson-place-label" htmlFor="lesson-place" className="sr-only">
              Przystanek
            </Label>
            <NativeSelect
              id="lesson-place"
              className="w-full max-w-full md:hidden [&_select]:h-11 [&_select]:text-base"
              aria-labelledby="lesson-place-label"
              value={plan.place ?? ""}
              onChange={(event) => {
                setPlace(event.target.value === "" ? null : event.target.value);
              }}
            >
              <NativeSelectOption value="">Wybierz miejsce</NativeSelectOption>
              {places.map((place) => (
                <NativeSelectOption key={place} value={place}>
                  {place}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <div className="hidden w-full min-w-0 md:block">
              <PlaceCombobox
                id="lesson-place-desktop"
                places={places}
                value={plan.place}
                onChange={setPlace}
                aria-labelledby="lesson-place-label"
                placeholder="Wybierz lub szukaj miejsca…"
              />
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Clock className="size-4 text-bus-deep" aria-hidden />
              Godziny lekcji
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Podaj godziny rozpoczęcia i zakończenia lekcji w poszczególne dni.
            </p>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-border/60">
            <div className="hidden border-b border-border/60 px-4 py-3 text-xs font-medium tracking-wide text-muted-foreground uppercase md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
              <span>Dzień</span>
              <span>Start lekcji</span>
              <span>Koniec lekcji</span>
            </div>
            <div className="divide-y divide-border/40">
              {WEEKDAY_OPTIONS.map(({ key, label }) => {
                const day = plan.days[key];
                const invalidEnd = dayHasEndBeforeStart(day?.start, day?.end);
                return (
                  <div
                    key={key}
                    className="grid min-w-0 grid-cols-1 gap-3 px-3 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] md:items-center md:gap-4 md:px-4 md:py-3"
                  >
                    <div className="font-medium text-asphalt">{label}</div>
                    <LessonTimeInput
                      id={`lesson-start-${key}`}
                      label="Start lekcji"
                      value={day?.start ?? ""}
                      onChange={(next) => updateDay(key, "start", next)}
                    />
                    <LessonTimeInput
                      id={`lesson-end-${key}`}
                      label="Koniec lekcji"
                      value={day?.end ?? ""}
                      disabled={!day?.start}
                      invalid={invalidEnd}
                      onChange={(next) => updateDay(key, "end", next)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-4 sm:px-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Bus className="size-4 text-bus-deep" aria-hidden />
              Jak dobieramy kursy?
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Na podstawie podanych godzin lekcji dopasowujemy odpowiednie kursy.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
          </div>

          {daysMissingEnd.length > 0 || daysInvalidEnd.length > 0 || saveError ? (
            <div className="space-y-2 text-sm leading-relaxed">
              {daysMissingEnd.length > 0 ? (
                <p className="text-asphalt/80">
                  Brak końca lekcji (
                  {daysMissingEnd.map((d) => d.label).join(", ")}
                  ) — odwozy nie dopasują się do planu w te dni.
                </p>
              ) : null}
              {daysInvalidEnd.length > 0 || saveError ? (
                <p className="text-destructive" role="alert">
                  {saveError ??
                    `Koniec lekcji nie może być wcześniejszy niż start (${daysInvalidEnd.map((d) => d.label).join(", ")}).`}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="lg"
                className={actionButtonClass}
                disabled={pending || daysInvalidEnd.length > 0}
                onClick={handleSave}
              >
                Zapisz plan
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className={actionButtonClass}
                disabled={!hasConfiguredLessons(plan) && !plan.place}
                onClick={handleClear}
              >
                Wyczyść
              </Button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center max-sm:[&_a]:h-11 max-sm:[&_a]:w-full max-sm:[&_a]:px-4 max-sm:[&_button]:h-11 max-sm:[&_button]:w-full max-sm:[&_button]:px-4">
              <SettingsTransferSheet
                canTransfer={
                  hasConfiguredLessons(stored) || hasConfiguredMzkRoute(mzkRoute)
                }
                triggerLabel="Użyj na innym urządzeniu"
              />
              <Link
                href="/przywroc"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Wpisz kod z kodu QR
              </Link>
            </div>
          </div>

          {hasConfiguredLessons(plan) ? (
            <Link
              href={filtersHref({
                place: plan.place,
                dateFilter: "today",
                direction: "all",
                matchLessonPlan: true,
              })}
              className="text-sm font-medium text-asphalt underline underline-offset-2 hover:text-foreground"
            >
              Zobacz dopasowany rozkład
            </Link>
          ) : null}
        </section>

        <section className={cardClass}>
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Printer className="size-4 text-bus-deep" aria-hidden />
              Wydrukuj plan dojazdów
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Wybierz, jakie połączenia chcesz uwzględnić na wydruku.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="sr-only">Rodzaj wydruku</legend>
            <label
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 text-left transition-colors",
                "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                printMode === "school" && "border-bus/40 bg-muted/40",
                !canPrint && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="lesson-print-mode"
                value="school"
                checked={printMode === "school"}
                disabled={!canPrint}
                onChange={() => setPrintMode("school")}
                title={
                  canPrint
                    ? undefined
                    : "Wybierz przystanek i uzupełnij godziny lekcji"
                }
                className="mt-1 size-4 accent-bus"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground sm:text-base">
                  Autobus szkolny
                </span>
                <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                  Tylko kursy autobusu szkolnego
                </span>
              </span>
            </label>
            <label
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 text-left transition-colors",
                "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                printMode === "school-mzk" && "border-bus/40 bg-muted/40",
                !canPrintMzk && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name="lesson-print-mode"
                value="school-mzk"
                checked={printMode === "school-mzk"}
                disabled={!canPrintMzk}
                onChange={() => setPrintMode("school-mzk")}
                title={
                  canPrintMzk
                    ? undefined
                    : canPrint
                      ? "Najpierw ustaw trasę MZK w zakładce MZK"
                      : "Wybierz przystanek, uzupełnij lekcje i ustaw trasę MZK"
                }
                className="mt-1 size-4 accent-bus"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground sm:text-base">
                  Autobus szkolny + MZK
                </span>
                <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                  Kursy autobusu szkolnego oraz MZK
                </span>
              </span>
            </label>
          </fieldset>

          {!canPrint ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Uzupełnij godziny lekcji (i wybierz przystanek), żeby wydrukować
              spersonalizowany plan dojazdów.
            </p>
          ) : null}
          {canPrint && !canPrintMzk ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Wydruk ze szkolnym + MZK wymaga zapisanej trasy w zakładce{" "}
              <Link
                href="/mzk"
                className="font-medium text-asphalt underline underline-offset-2 hover:text-foreground"
              >
                MZK
              </Link>
              . Na kartce pojawi się tylko najbliższy kurs MZK do planu lekcji.
            </p>
          ) : canPrintMzk ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Wariant ze szkolnym + MZK dodaje tylko najbliższy kurs MZK (wyjazd
              i powrót), bez całego rozkładu linii.
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            variant="outline"
            className={actionButtonClass}
            disabled={!selectedPrintReady}
            aria-label={
              printMode === "school"
                ? "Wydrukuj plan dojazdów szkolnych"
                : "Wydrukuj plan dojazdów szkolnych z najbliższym MZK"
            }
            title={
              selectedPrintReady
                ? undefined
                : printMode === "school-mzk"
                  ? canPrint
                    ? "Najpierw ustaw trasę MZK w zakładce MZK"
                    : "Wybierz przystanek, uzupełnij lekcje i ustaw trasę MZK"
                  : "Wybierz przystanek i uzupełnij godziny lekcji"
            }
            onClick={() => handlePrint(printMode)}
          >
            <Printer aria-hidden />
            Drukuj
          </Button>
        </section>
      </div>
      <LessonPlanPrint schedule={schedule} plan={plan} mode="school" />
      {mzkSchedule ? (
        <LessonPlanPrint
          schedule={schedule}
          plan={plan}
          mode="school-mzk"
          mzkSchedule={mzkSchedule}
          mzkRoute={mzkRoute}
        />
      ) : null}
    </>
  );
}
