import { MzkRouteForm } from "@/components/mzk-route-form";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { loadMzkScheduleSnapshot } from "@/lib/mzk/load-schedule";

export default async function MzkPage() {
  const mzkSchedule = await loadMzkScheduleSnapshot();

  return (
    <PageShell>
      <div className="mb-8">
        <SiteHeader current="mzk" />
      </div>

      <header className="animate-rise-delay mb-10 space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Trasa MZK
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Ustaw trasę <span className="font-medium text-foreground">do szkoły</span>{" "}
          (wsiadanie → wysiadanie). Na rozkładzie w trybie{" "}
          <span className="font-medium text-foreground">Szkolny + MZK</span>{" "}
          dowozy użyją tej trasy, a odwozy automatycznie odwrotnej (szkoła →
          dom). Tylko poniedziałek–piątek, dni nauki wg kalendarza MZK.
        </p>
        <p className="max-w-xl text-sm text-muted-foreground">
          Godziny pochodzą z oficjalnego GTFS MZK — na tabliczce przystankowej
          bywają o 1–3 min inaczej.
        </p>
      </header>

      <div className="animate-rise-delay-2">
        {mzkSchedule && mzkSchedule.stops.length > 0 ? (
          <MzkRouteForm schedule={mzkSchedule} />
        ) : (
          <p className="text-muted-foreground">
            Najpierw pobierz rozkład MZK ({`npm run fetch:mzk`}), żeby wybrać
            przystanki z listy.
          </p>
        )}
      </div>
    </PageShell>
  );
}
