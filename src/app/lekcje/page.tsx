import { LessonPlanForm } from "@/components/lesson-plan-form";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { collectPlaces } from "@/lib/dowozy/filter-schedule";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { DOWOZY_SOURCE_URL } from "@/lib/dowozy/types";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Plan lekcji",
  description:
    "Zapisz godziny startu i końca lekcji dziecka, żeby rozkład dopasował dowozy i odwozy.",
  path: "/lekcje",
});

export default async function LekcjePage() {
  const schedule = await loadScheduleSnapshot();
  const places = schedule ? collectPlaces(schedule) : [];

  return (
    <PageShell>
      <div className="mb-8">
        <SiteHeader current="lekcje" />
      </div>

      <header className="animate-rise-delay mb-10 space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Plan lekcji dziecka
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Podaj godzinę startu (i opcjonalnie końca) lekcji w każdy dzień
          tygodnia. Na rozkładzie włączysz dopasowanie kursów pod te godziny.
        </p>
      </header>

      <div className="animate-rise-delay-2">
        {places.length > 0 ? (
          <LessonPlanForm places={places} />
        ) : (
          <p className="text-muted-foreground">
            Lista miejsc jest chwilowo niedostępna — rozkład szkolny nie
            załadował się. Spróbuj ponownie później albo zajrzyj na stronę{" "}
            <a
              href={DOWOZY_SOURCE_URL}
              className="underline underline-offset-2 hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              szkoły
            </a>
            .
          </p>
        )}
      </div>
    </PageShell>
  );
}
