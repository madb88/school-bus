import { PageShell } from "@/components/page-shell";
import { ScheduleBoard } from "@/components/schedule-board";
import { ScheduleStatusBanner } from "@/components/schedule-status-banner";
import { SiteHeader } from "@/components/site-header";
import { parseFilterParams } from "@/lib/dowozy/filter-url";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { DOWOZY_SOURCE_URL } from "@/lib/dowozy/types";
import { loadMzkScheduleMeta } from "@/lib/mzk/load-schedule";
import {
  mzkScheduleFreshness,
  schoolScheduleFreshness,
} from "@/lib/schedule-freshness";
import { buildPageMetadata, rootDescription } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Rozkład dowozów",
  description: rootDescription,
  path: "/",
});

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const [schedule, mzkMeta] = await Promise.all([
    loadScheduleSnapshot(),
    loadMzkScheduleMeta(),
  ]);
  const initialFilters = parseFilterParams(params);
  const freshness = [
    schedule ? schoolScheduleFreshness(schedule.fetchedAt) : null,
    mzkMeta
      ? mzkScheduleFreshness(mzkMeta.fetchedAt, mzkMeta.feedEndDate)
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <PageShell wide>
      <div className="mb-8 print:hidden">
        <SiteHeader current="rozklad" />
      </div>
      {schedule ? (
        <>
          <h1 className="sr-only">Rozkład dowozów</h1>
          <ScheduleStatusBanner
            items={freshness}
            className="mb-6 print:hidden"
          />
          <ScheduleBoard
            schedule={schedule}
            mzkAvailable={Boolean(mzkMeta)}
            initialFilters={initialFilters}
          />
        </>
      ) : (
        <div className="space-y-8">
          <div className="animate-rise-delay space-y-3">
            <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              Rozkład dowozów
            </h1>
            <p className="text-muted-foreground">
              Rozkład szkolny jest chwilowo niedostępny. Spróbuj ponownie
              później albo sprawdź źródło na stronie{" "}
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
          </div>
        </div>
      )}
    </PageShell>
  );
}
