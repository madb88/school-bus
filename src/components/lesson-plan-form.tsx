"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  clearLessonPlan,
  hasConfiguredLessons,
  saveLessonPlan,
} from "@/lib/child-schedule/storage";
import { formatTimeInput } from "@/lib/child-schedule/match";
import { savePreferredPlace } from "@/lib/child-schedule/preferred-place";
import {
  EMPTY_LESSON_PLAN,
  WEEKDAY_OPTIONS,
  type ChildLessonPlan,
  type WeekdayKey,
} from "@/lib/child-schedule/types";
import { filtersHref } from "@/lib/dowozy/filter-url";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";

type LessonPlanFormProps = {
  places: string[];
};

export function LessonPlanForm({ places }: LessonPlanFormProps) {
  const stored = useLessonPlan();
  const [draft, setDraft] = useState<ChildLessonPlan | null>(null);
  const plan = draft ?? stored;
  const [savedFlash, setSavedFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  function updateDay(
    key: WeekdayKey,
    field: "start" | "end",
    value: string,
  ) {
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
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
    });
  }

  function handleClear() {
    clearLessonPlan();
    setDraft({ ...EMPTY_LESSON_PLAN, days: {} });
    setSavedFlash(false);
  }

  return (
    <div className="space-y-8">
      <label className="flex max-w-md flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Przystanek / miejscowość
        </span>
        <select
          value={plan.place ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setDraft((prev) => ({
              ...(prev ?? stored),
              place: value === "" ? null : value,
            }));
          }}
          className="h-11 rounded-lg border border-border bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Wybierz miejsce</option>
          {places.map((place) => (
            <option key={place} value={place}>
              {place}
            </option>
          ))}
        </select>
      </label>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/90 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
        <table className="w-full min-w-[28rem] text-left text-sm">
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
              return (
                <tr
                  key={key}
                  className="border-b border-border/40 last:border-b-0"
                >
                  <td className="px-4 py-3 font-medium text-asphalt">
                    {label}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={day?.start ?? ""}
                      onChange={(event) =>
                        updateDay(key, "start", event.target.value)
                      }
                      className="h-10 w-full max-w-[9rem] rounded-lg border border-border bg-background px-2 tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={day?.end ?? ""}
                      disabled={!day?.start}
                      onChange={(event) =>
                        updateDay(key, "end", event.target.value)
                      }
                      className="h-10 w-full max-w-[9rem] rounded-lg border border-border bg-background px-2 tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        Start służy do doboru dowozów (kurs przed lekcją). Koniec — do odwozów
        (kurs o godzinie końca lub później). Dane zapisujemy tylko w tej
        przeglądarce.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          variant="secondary"
          disabled={pending}
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
        {savedFlash ? (
          <span className="text-sm font-medium text-bus-deep">Zapisano</span>
        ) : null}
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
  );
}
