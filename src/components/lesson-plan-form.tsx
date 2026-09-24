"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  LessonPlanPrint,
  type LessonPlanPrintMode,
} from "@/components/lesson-plan-print";
import { PlaceCombobox } from "@/components/place-combobox";
import { SettingsTransferSheet } from "@/components/settings-transfer-sheet";
import { Button } from "@/components/ui/button";
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
    clearLessonPlan();
    setDraft({ ...EMPTY_LESSON_PLAN, days: {} });
    setSaveError(null);
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
    <div className="space-y-8 print:hidden">
      <div className="space-y-3">
        <div className="flex max-w-md flex-col gap-1.5">
          <Label
            id="lesson-place-label"
            htmlFor="lesson-place"
            className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            Przystanek / miejscowość
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
          <div className="hidden w-full md:block">
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

        <div
          className={
            "flex flex-col gap-3 rounded-xl border border-border/70 bg-card/90 px-4 py-3 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]" +
            (canPrint ? "" : " opacity-60")
          }
        >
          <p className="text-sm leading-relaxed text-muted-foreground">
            {canPrint
              ? "Wydrukuj spersonalizowany plan dojazdów: tabela poniedziałek–piątek z godzinami wyjazdu i powrotu dopasowanymi do lekcji dziecka."
              : "Uzupełnij godziny lekcji (i wybierz przystanek), żeby wydrukować spersonalizowany plan dojazdów."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="shrink-0"
              disabled={!canPrint}
              aria-label="Wydrukuj plan dojazdów szkolnych"
              title={
                canPrint
                  ? undefined
                  : "Wybierz przystanek i uzupełnij godziny lekcji"
              }
              onClick={() => handlePrint("school")}
            >
              <Printer aria-hidden />
              Drukuj szkolny
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="shrink-0"
              disabled={!canPrintMzk}
              aria-label="Wydrukuj plan dojazdów szkolnych z najbliższym MZK"
              title={
                canPrintMzk
                  ? undefined
                  : canPrint
                    ? "Najpierw ustaw trasę MZK w zakładce MZK"
                    : "Wybierz przystanek, uzupełnij lekcje i ustaw trasę MZK"
              }
              onClick={() => handlePrint("school-mzk")}
            >
              <Printer aria-hidden />
              Drukuj szkolny + MZK
            </Button>
          </div>
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
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/90 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
        <table className="w-full min-w-md text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs tracking-wide text-muted-foreground uppercase">
              <th className="px-4 py-3 font-medium">Dzień</th>
              <th className="px-4 py-3 font-medium">Start lekcji</th>
              <th className="px-4 py-3 font-medium">Koniec lekcji</th>
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_OPTIONS.map(({ key, label }) => {
              const day = plan.days[key];
              const invalidEnd = dayHasEndBeforeStart(day?.start, day?.end);
              return (
                <tr
                  key={key}
                  className="border-b border-border/40 last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-asphalt">
                    {label}
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="time"
                      value={day?.start ?? ""}
                      onChange={(event) =>
                        updateDay(key, "start", event.target.value)
                      }
                      className="h-10 max-w-36 bg-background tabular-nums"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="time"
                      value={day?.end ?? ""}
                      disabled={!day?.start}
                      aria-invalid={invalidEnd || undefined}
                      onChange={(event) =>
                        updateDay(key, "end", event.target.value)
                      }
                      className="h-10 max-w-36 bg-background tabular-nums aria-invalid:border-destructive"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="max-w-xl space-y-2 text-sm leading-relaxed text-muted-foreground">
        <p>
          Start służy do doboru dowozów (kurs przed lekcją). Koniec — do odwozów
          (kurs o godzinie końca lub później). Dane zapisujemy tylko w tej
          przeglądarce.
        </p>
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

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          disabled={pending || daysInvalidEnd.length > 0}
          onClick={handleSave}
        >
          Zapisz plan
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled={!hasConfiguredLessons(plan) && !plan.place}
          onClick={handleClear}
        >
          Wyczyść
        </Button>
        <SettingsTransferSheet
          canTransfer={
            hasConfiguredLessons(stored) || hasConfiguredMzkRoute(mzkRoute)
          }
        />
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
      </div>
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
