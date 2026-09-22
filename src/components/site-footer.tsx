import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { DOWOZY_SOURCE_URL } from "@/lib/dowozy/types";
import { loadMzkScheduleSnapshot } from "@/lib/mzk/load-schedule";
import { MZK_DEVELOPER_PAGE_URL } from "@/lib/mzk/types";

const CONTACT_EMAIL = "kaminskiqba@gmail.com";

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
  const [schoolSchedule, mzkSchedule] = await Promise.all([
    loadScheduleSnapshot(),
    loadMzkScheduleSnapshot(),
  ]);

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 sm:px-10">
        {(schoolSchedule || mzkSchedule) && (
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
            {mzkSchedule ? (
              <p>
                Rozkład MZK zaktualizowano{" "}
                {formatFetchedAt(mzkSchedule.fetchedAt)}
                {" · "}
                <a
                  href={mzkSchedule.sourceUrl || MZK_DEVELOPER_PAGE_URL}
                  className="underline underline-offset-2 hover:text-foreground"
                  target="_blank"
                  rel="noreferrer"
                >
                  źródło: {mzkSchedule.attribution}
                </a>
                {" · "}
                godziny z GTFS mogą różnić się o 1–3 min od tabliczki na
                przystanku
              </p>
            ) : null}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <p className="text-sm text-muted-foreground">
            © {year} Dojazdy do szkoły
          </p>
          <p className="text-sm text-muted-foreground">
            Masz pomysł na usprawnienie? Napisz:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-foreground underline underline-offset-2 hover:text-bus-deep"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
