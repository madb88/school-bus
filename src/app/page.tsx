import { PageShell } from "@/components/page-shell";
import { ScheduleBoard } from "@/components/schedule-board";
import { SiteHeader } from "@/components/site-header";
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
    <PageShell>
      {schedule ? (
        <ScheduleBoard
          schedule={schedule}
          initialMatchLessonPlan={initialMatchLessonPlan}
        />
      ) : (
        <div className="space-y-8">
          <SiteHeader current="rozklad" />
          <div className="animate-rise-delay space-y-3">
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
    </PageShell>
  );
}
