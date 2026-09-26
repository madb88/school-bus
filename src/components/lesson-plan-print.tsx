"use client";

import { useSyncExternalStore } from "react";
import { hasConfiguredLessons } from "@/lib/child-schedule/storage";
import {
  clampLessonMatchWindow,
  DEFAULT_LESSON_MATCH_WINDOW_MIN,
  getLessonMatchWindowSnapshot,
  subscribeLessonMatchWindow,
} from "@/lib/child-schedule/match-window";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import {
  buildWeeklyLessonPrint,
  nearestSchoolDeparture,
  nearestSchoolReturn,
  type WeeklyPrintDay,
  type WeeklyPrintMzkTrip,
} from "@/lib/dowozy/weekly-print";
import type { Schedule } from "@/lib/dowozy/types";
import type { MzkRoutePreference } from "@/lib/mzk/route-preference";
import type { MzkSchedule } from "@/lib/mzk/types";
import { siteName } from "@/lib/site-metadata";

const PRINT_LESSONS_URL = "https://autobusszkolny.pl/lekcje";

export type LessonPlanPrintMode = "school" | "school-mzk" | "compact";

type LessonPlanPrintProps = {
  schedule: Schedule;
  plan: ChildLessonPlan;
  mode: LessonPlanPrintMode;
  mzkSchedule?: MzkSchedule | null;
  mzkRoute?: MzkRoutePreference | null;
};

function BrandMark() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-md border border-black text-black"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="6" width="18" height="11" rx="2" />
          <path d="M7 17v2M17 17v2M3 12h18M7 9h2M15 9h2" />
        </svg>
      </span>
      <span className="font-display text-sm font-semibold tracking-tight text-black">
        {siteName}
      </span>
    </div>
  );
}

function TimeList({ times }: { times: string[] }) {
  if (times.length === 0) {
    return <span className="text-neutral-500">—</span>;
  }
  return (
    <span className="flex flex-col gap-0.5 leading-tight">
      {times.map((time) => (
        <span key={time}>{time}</span>
      ))}
    </span>
  );
}

function MzkCell({ trip }: { trip: WeeklyPrintMzkTrip | null }) {
  if (!trip) {
    return <span className="text-neutral-500">—</span>;
  }
  return (
    <span className="flex flex-col gap-0.5 leading-tight">
      <span>{trip.time}</span>
      <span className="text-[0.65rem] font-medium text-neutral-600">
        linia {trip.route}
      </span>
    </span>
  );
}

const cellClass =
  "border border-black px-2 py-2 align-top text-center tabular-nums";
const rowLabelClass =
  "border border-black px-2 py-2 text-left font-semibold whitespace-nowrap";

function PrintTable({
  days,
  includeMzk,
}: {
  days: WeeklyPrintDay[];
  includeMzk: boolean;
}) {
  return (
    <div className="mt-5 pr-1">
      <table className="w-full table-fixed border-collapse text-[11px] leading-snug text-black outline outline-1 outline-black break-inside-avoid">
        <colgroup>
          <col className="w-[4.75rem]" />
          {days.map((day) => (
            <col key={day.weekday} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className={`${rowLabelClass} bg-neutral-100`} />
            {days.map((day) => (
              <th
                key={day.weekday}
                className={`${cellClass} bg-neutral-100 font-semibold`}
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className={rowLabelClass}>
              Lekcje
            </th>
            {days.map((day) => (
              <td key={day.weekday} className={cellClass}>
                {day.lessonStart ? (
                  day.lessonEnd ? (
                    <>
                      {day.lessonStart}
                      <span className="text-neutral-600">–</span>
                      {day.lessonEnd}
                    </>
                  ) : (
                    day.lessonStart
                  )
                ) : (
                  <span className="text-neutral-500">—</span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={rowLabelClass}>
              Wyjazd
            </th>
            {days.map((day) => (
              <td key={day.weekday} className={cellClass}>
                <TimeList times={day.departures} />
              </td>
            ))}
          </tr>
          {includeMzk ? (
            <tr>
              <th scope="row" className={rowLabelClass}>
                MZK wyjazd
              </th>
              {days.map((day) => (
                <td key={day.weekday} className={cellClass}>
                  <MzkCell trip={day.mzkDeparture} />
                </td>
              ))}
            </tr>
          ) : null}
          <tr>
            <th scope="row" className={rowLabelClass}>
              Powrót
            </th>
            {days.map((day) => (
              <td key={day.weekday} className={cellClass}>
                <TimeList times={day.returns} />
              </td>
            ))}
          </tr>
          {includeMzk ? (
            <tr>
              <th scope="row" className={rowLabelClass}>
                MZK powrót
              </th>
              {days.map((day) => (
                <td key={day.weekday} className={cellClass}>
                  <MzkCell trip={day.mzkReturn} />
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function CompactTime({ time }: { time: string | null }) {
  if (!time) {
    return <span className="text-neutral-500">—</span>;
  }
  return <span className="tabular-nums">{time}</span>;
}

function CompactStrip({
  days,
  place,
}: {
  days: WeeklyPrintDay[];
  place: string;
}) {
  return (
    <div className="lesson-plan-print-compact-inner break-inside-avoid">
      <div className="lesson-plan-print-compact-strip w-[70mm] border border-dashed border-black px-2.5 py-2.5 text-black">
        <header className="border-b border-black pb-1.5">
          <p className="text-[0.55rem] font-medium tracking-[0.12em] uppercase">
            Plan · do kieszeni
          </p>
          <p className="mt-0.5 font-display text-sm font-bold leading-tight tracking-tight">
            {place}
          </p>
        </header>

        <ul className="mt-1.5 divide-y divide-black/40">
          {days.map((day) => {
            const departure = nearestSchoolDeparture(day.departures);
            const returnTime = nearestSchoolReturn(day.returns);
            return (
              <li
                key={day.weekday}
                className="grid grid-cols-[2.1rem_1fr_1fr] items-center gap-1 py-1.5 text-[0.8rem] leading-none"
              >
                <span className="font-semibold">{day.label}</span>
                <span className="flex items-baseline gap-0.5">
                  <span className="text-[0.65rem] text-neutral-600" aria-hidden>
                    →
                  </span>
                  <CompactTime time={departure} />
                </span>
                <span className="flex items-baseline gap-0.5">
                  <span className="text-[0.65rem] text-neutral-600" aria-hidden>
                    ←
                  </span>
                  <CompactTime time={returnTime} />
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-1.5 border-t border-black pt-1 text-[0.5rem] tracking-wide text-neutral-600">
          {siteName}
        </p>
      </div>
      <p className="mt-2 w-[70mm] text-center text-[0.65rem] text-neutral-600">
        Wytnij wzdłuż linii i złóż
      </p>
    </div>
  );
}

function printModeClass(mode: LessonPlanPrintMode): string {
  if (mode === "school-mzk") return "lesson-plan-print lesson-plan-print-mzk";
  if (mode === "compact") return "lesson-plan-print lesson-plan-print-compact";
  return "lesson-plan-print lesson-plan-print-school";
}

export function LessonPlanPrint({
  schedule,
  plan,
  mode,
  mzkSchedule = null,
  mzkRoute = null,
}: LessonPlanPrintProps) {
  const storedWindowRaw = useSyncExternalStore(
    subscribeLessonMatchWindow,
    getLessonMatchWindowSnapshot,
    () => String(DEFAULT_LESSON_MATCH_WINDOW_MIN),
  );
  const windowMin = clampLessonMatchWindow(Number(storedWindowRaw));

  if (!plan.place || !hasConfiguredLessons(plan)) return null;

  const includeMzk = mode === "school-mzk";
  const days = buildWeeklyLessonPrint(
    schedule,
    plan,
    windowMin,
    includeMzk
      ? { mzkSchedule, mzkRoute }
      : undefined,
  );

  if (mode === "compact") {
    return (
      <section className={`${printModeClass(mode)} hidden`}>
        <CompactStrip days={days} place={plan.place} />
      </section>
    );
  }

  return (
    <section className={`${printModeClass(mode)} hidden`}>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-medium tracking-[0.14em] text-black uppercase">
            {includeMzk
              ? "Plan dojazdów · szkolny + MZK"
              : "Plan dojazdów · szkolny"}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-black">
            {plan.place}
          </h1>
          {schedule.periodLabel ? (
            <p className="mt-1 text-sm text-neutral-700">
              Obowiązuje: {schedule.periodLabel}
            </p>
          ) : null}
          {includeMzk ? (
            <p className="mt-1 text-xs text-neutral-700">
              MZK: tylko najbliższy kurs do planu lekcji (linia i godzina
              odjazdu).
            </p>
          ) : null}
        </div>
        <BrandMark />
      </header>

      <PrintTable days={days} includeMzk={includeMzk} />

      <footer className="mt-8 flex flex-col items-center gap-1.5 break-inside-avoid">
        {/* eslint-disable-next-line @next/next/no-img-element -- static QR for print */}
        <img
          src="/qr-lekcje.svg"
          alt={`Kod QR do ${PRINT_LESSONS_URL}`}
          width={96}
          height={96}
          className="size-24"
        />
        <p className="text-[0.65rem] tracking-wide text-neutral-700">
          {PRINT_LESSONS_URL.replace(/^https?:\/\//, "")}
        </p>
      </footer>
    </section>
  );
}
