import { ScheduleBoard } from "@/components/schedule-board";
import { SiteNav } from "@/components/site-nav";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { DOWOZY_SOURCE_URL } from "@/lib/dowozy/types";

type HomeProps = {
  searchParams: Promise<{ dopasuj?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const schedule = await loadScheduleSnapshot();
  const initialMatchLessonPlan = params.dopasuj === "1";

  return (
    <main className="relative flex-1 overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ffe08a55_0%,_transparent_55%),linear-gradient(180deg,#f2f6fb_0%,#e8f0f8_45%,#dfeaf5_100%)]"
      />
      <div className="relative mx-auto max-w-4xl px-6 py-12 sm:px-10 sm:py-16">
        {schedule ? (
          <ScheduleBoard
            schedule={schedule}
            initialMatchLessonPlan={initialMatchLessonPlan}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs font-semibold tracking-[0.2em] text-bus-deep uppercase">
                School Bus
              </p>
              <SiteNav current="rozklad" />
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
                Rozkład dowozów
              </h1>
              <p className="text-muted-foreground">
                Brak snapshota. Uruchom{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                  npm run scrape:dowozy
                </code>
                , żeby pobrać rozkład ze strony{" "}
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
      </div>
    </main>
  );
}
