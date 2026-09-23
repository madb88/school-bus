import { formatAppVersion } from "@/lib/app-version";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { DOWOZY_SOURCE_URL } from "@/lib/dowozy/types";
import { loadMzkScheduleMeta } from "@/lib/mzk/load-schedule";
import { MZK_DEVELOPER_PAGE_URL } from "@/lib/mzk/types";

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

export async function SiteFooter() {
  const year = new Date().getFullYear();
  const version = formatAppVersion();
  const [schoolSchedule, mzkMeta] = await Promise.all([
    loadScheduleSnapshot(),
    loadMzkScheduleMeta(),
  ]);

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 sm:px-10">
        {(schoolSchedule || mzkMeta) && (
          <div className="space-y-1 text-xs text-muted-foreground sm:text-sm">
            {schoolSchedule ? (
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
            ) : null}
            {mzkMeta ? (
              <p>
                Rozkład MZK zaktualizowano{" "}
                {formatFetchedAt(mzkMeta.fetchedAt)}
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
                godziny z GTFS mogą różnić się o 1–3 min od tabliczki na
                przystanku
              </p>
            ) : null}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          © {year} Dojazdy do szkoły
          <span aria-hidden className="mx-1.5 text-border">
            ·
          </span>
          <span className="tabular-nums">{version}</span>
        </p>
      </div>
    </footer>
  );
}
