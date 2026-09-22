import { LessonPlanForm } from "@/components/lesson-plan-form";
import { SiteNav } from "@/components/site-nav";
import { collectPlaces } from "@/lib/dowozy/filter-schedule";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";

export default async function LekcjePage() {
  const schedule = await loadScheduleSnapshot();
  const places = schedule ? collectPlaces(schedule) : [];

  return (
    <main className="relative flex-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffe08a55_0%,_transparent_55%),linear-gradient(180deg,#f2f6fb_0%,#e8f0f8_45%,#dfeaf5_100%)]"
      />
      <div className="relative mx-auto max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-bus-deep uppercase">
            School Bus
          </p>
          <SiteNav current="lekcje" />
        </div>

        <header className="mb-10 space-y-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
            Plan lekcji dziecka
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Podaj godzinę startu (i opcjonalnie końca) lekcji w każdy dzień
            tygodnia. Na rozkładzie włączysz dopasowanie kursów pod te godziny.
          </p>
        </header>

        {places.length > 0 ? (
          <LessonPlanForm places={places} />
        ) : (
          <p className="text-muted-foreground">
            Najpierw pobierz rozkład ({`npm run scrape:dowozy`}), żeby wybrać
            przystanek z listy miejsc.
          </p>
        )}
      </div>
    </main>
  );
}
