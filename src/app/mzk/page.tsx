import { MzkRouteForm } from "@/components/mzk-route-form";
import { PageShell } from "@/components/page-shell";
import { ScheduleStatusBanner } from "@/components/schedule-status-banner";
import { SiteHeader } from "@/components/site-header";
import { loadMzkScheduleSnapshot } from "@/lib/mzk/load-schedule";
import { MZK_DEVELOPER_PAGE_URL } from "@/lib/mzk/types";
import { mzkScheduleFreshness } from "@/lib/schedule-freshness";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Trasa do szkoły",
  description:
    "Ustaw wsiadanie i wysiadanie MZK jako alternatywę dla dowozów szkolnych do Szkoły Olimpijczyków.",
  path: "/mzk",
});

export default async function MzkPage() {
  const mzkSchedule = await loadMzkScheduleSnapshot();
  const freshness = mzkSchedule
    ? [mzkScheduleFreshness(mzkSchedule.fetchedAt, mzkSchedule.feedEndDate)]
    : [];

  return (
    <PageShell>
      <div className="mb-8">
        <SiteHeader current="mzk" />
      </div>

      <header className="animate-rise-delay mb-10 space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Trasa do szkoły
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Ustaw trasę do szkoły (dowóz). Powrót ze szkoły zostanie ustawiony
          automatycznie.
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Na rozkładzie w trybie{" "}
          <span className="font-medium text-foreground">Szkolny + MZK</span>{" "}
          dowozy użyją tej trasy, a odwozy automatycznie odwrotnej (szkoła →
          dom). Tylko poniedziałek–piątek, dni nauki wg kalendarza MZK.
        </p>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Godziny pochodzą z oficjalnego GTFS MZK — na tabliczce przystankowej
          bywają o 1–3 min inaczej.
        </p>
      </header>

      <div className="animate-rise-delay-2 space-y-6">
        <ScheduleStatusBanner items={freshness} />
        {mzkSchedule && mzkSchedule.stops.length > 0 ? (
          <MzkRouteForm schedule={mzkSchedule} />
        ) : (
          <p className="text-muted-foreground">
            Rozkład MZK jest chwilowo niedostępny. Spróbuj ponownie później
            albo sprawdź źródło na stronie{" "}
            <a
              href={MZK_DEVELOPER_PAGE_URL}
              className="underline underline-offset-2 hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              MZK Zielona Góra
            </a>
            .
          </p>
        )}
      </div>
    </PageShell>
  );
}
