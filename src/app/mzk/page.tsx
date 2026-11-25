import { MzkOfflineNotice } from "@/components/mzk-offline-notice";
import { MzkPlanScope } from "@/components/mzk-plan-scope";
import { PageEyebrow } from "@/components/page-eyebrow";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { getAuthSession } from "@/lib/auth/current-user";
import { loadMzkScheduleSnapshot } from "@/lib/mzk/load-schedule";
import { loadSchoolDetail, loadSchools } from "@/lib/schools/load";
import { resolveServerSchoolContextForPlan } from "@/lib/schools/resolve-server";
import { mzkScheduleFreshness } from "@/lib/schedule-freshness";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Trasa do szkoły",
  description:
    "Ustaw wsiadanie i wysiadanie MZK jako alternatywę dla dowozów szkolnych.",
  path: "/mzk",
});

type MzkSearchParams = Record<string, string | string[] | undefined>;

export default async function MzkPage({
  searchParams,
}: {
  searchParams: Promise<MzkSearchParams>;
}) {
  const params = await searchParams;
  const session = await getAuthSession();
  const user = session.status === "authenticated" ? session.user : null;
  const accountPlans = user?.plans ?? [];
  // The route belongs to a plan: `?plan=<id>` loads that plan's school.
  const { selection, cities } = await resolveServerSchoolContextForPlan(
    params,
    accountPlans,
  );
  const schoolId = selection.schoolId;
  const rawPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const urlPlanId = rawPlan?.trim().toLowerCase() || null;

  const [mzkSchedule, schoolDetail, allSchools] = await Promise.all([
    loadMzkScheduleSnapshot(schoolId),
    loadSchoolDetail(schoolId),
    loadSchools(),
  ]);
  const freshness = mzkSchedule
    ? [mzkScheduleFreshness(mzkSchedule.fetchedAt, mzkSchedule.feedEndDate)]
    : [];

  return (
    <PageShell header={<SiteHeader current="mzk" />}>
      <div className="page-enter">
        <header className="mb-10 space-y-3">
          <PageEyebrow>MZK</PageEyebrow>
          <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
            Trasa do szkoły
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Ustaw trasę do szkoły (dowóz) dla wybranego planu. Powrót ze szkoły
            zostanie ustawiony automatycznie.
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

        <div className="space-y-6">
          <MzkOfflineNotice items={freshness} />
          <MzkPlanScope
            accountPlans={accountPlans}
            urlPlanId={urlPlanId}
            schoolId={schoolId}
            cities={cities}
            allSchools={allSchools}
            schedule={mzkSchedule}
            schoolStopIds={schoolDetail?.mzkStopIds ?? []}
            placeStops={schoolDetail?.mzkPlaceStops ?? []}
          />
        </div>
      </div>
    </PageShell>
  );
}
