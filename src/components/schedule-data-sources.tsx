import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { DOWOZY_SOURCE_URL } from "@/lib/dowozy/types";
import { loadMzkScheduleMeta } from "@/lib/mzk/load-schedule";
import { MZK_DEVELOPER_PAGE_URL } from "@/lib/mzk/types";
import { schoolScopeLabel } from "@/lib/site-metadata";

function formatFetchedAt(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("pl-PL", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? "";

    return `${get("day")}.${get("month")}.${get("year")}, ${get("hour")}:${get("minute")}`;
  } catch {
    return iso;
  }
}

/** Last-updated / source lines for school + MZK schedules (O projekcie). */
export async function ScheduleDataSources() {
  const [loaded, mzkMeta] = await Promise.all([
    loadScheduleSnapshot(),
    loadMzkScheduleMeta(),
  ]);
  const schoolSchedule = loaded?.schedule ?? null;

  if (!schoolSchedule && !mzkMeta) return null;

  return (
    <section aria-labelledby="about-sources-heading" className="space-y-4">
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-[0.14em] text-bus uppercase">
          <span aria-hidden className="inline-block h-px w-5 bg-bus/70" />
          Źródła danych
        </p>
        <h2
          id="about-sources-heading"
          className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl"
        >
          Skąd pochodzą rozkłady
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Poniżej widać, kiedy dane zostały ostatnio pobrane i z jakich
          oficjalnych źródeł korzysta aplikacja.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-border/50 bg-card px-4 py-4 text-sm leading-relaxed text-muted-foreground sm:px-5 sm:py-5 sm:text-base">
        {schoolSchedule ? (
          <>
            <p className="text-foreground/90">
              Rozkład jazdy dla: {schoolScopeLabel}
            </p>
            <p>
              {schoolSchedule.periodLabel
                ? `Obowiązuje: ${schoolSchedule.periodLabel} · `
                : null}
              Rozkład szkolny zaktualizowano{" "}
              {formatFetchedAt(schoolSchedule.fetchedAt)}
              {" · "}
              <a
                href={schoolSchedule.sourceUrl || DOWOZY_SOURCE_URL}
                className="underline underline-offset-2 hover:text-foreground"
                target="_blank"
                rel="noreferrer"
              >
                źródło: szkolaolimpijczykow.pl
              </a>
            </p>
          </>
        ) : null}
        {mzkMeta ? (
          <p>
            Rozkład MZK zaktualizowano {formatFetchedAt(mzkMeta.fetchedAt)}
            {" · "}
            <a
              href={mzkMeta.sourceUrl || MZK_DEVELOPER_PAGE_URL}
              className="underline underline-offset-2 hover:text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              źródło: {mzkMeta.attribution}
            </a>
            {" · "}
            godziny z GTFS mogą różnić się o 1–3 min od tabliczki na przystanku
          </p>
        ) : null}
      </div>
    </section>
  );
}
