import { PageShell } from "@/components/page-shell";
import { ScheduleBoard } from "@/components/schedule-board";
import { ScheduleStatusBanner } from "@/components/schedule-status-banner";
import { ScheduleUnavailable } from "@/components/schedule-unavailable";
import { SiteHeader } from "@/components/site-header";
import { fetchPlus } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPlusAccess } from "@/lib/billing/access";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { overrideFreshnessInfo } from "@/lib/dowozy/override-freshness";
import { loadMzkScheduleMeta } from "@/lib/mzk/load-schedule";
import {
  mzkScheduleFreshness,
  schoolScheduleFreshness,
} from "@/lib/schedule-freshness";
import {
  buildPageMetadata,
  rootDescription,
} from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Rozkład dowozów",
  description: rootDescription,
  path: "/",
});

export default async function Home() {
  const [loaded, mzkMeta, user] = await Promise.all([
    loadScheduleSnapshot(),
    loadMzkScheduleMeta(),
    getCurrentUser(),
  ]);
  const schedule = loaded?.schedule ?? null;
  const freshness = [
    schedule ? schoolScheduleFreshness(schedule.fetchedAt) : null,
    loaded ? overrideFreshnessInfo(loaded) : null,
    mzkMeta
      ? mzkScheduleFreshness(mzkMeta.fetchedAt, mzkMeta.feedEndDate)
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const plus = user ? await fetchPlus(user.sessionToken) : "unavailable";
  const plusAccess =
    user != null &&
    (hasPlusAccess(user.role, plus) || user.plans.length > 0);
  const accountPlans = plusAccess && user ? user.plans : [];

  return (
    <PageShell wide header={<SiteHeader current="rozklad" />}>
      <div className="page-enter">
        {schedule ? (
          <>
            <h1 className="sr-only">Rozkład dowozów</h1>
            <ScheduleStatusBanner
              items={freshness}
              className="mb-4 print:hidden md:mb-6"
            />
            <ScheduleBoard
              schedule={schedule}
              mzkAvailable={Boolean(mzkMeta)}
              accountPlans={accountPlans}
            />
          </>
        ) : (
          <ScheduleUnavailable />
        )}
      </div>
    </PageShell>
  );
}
