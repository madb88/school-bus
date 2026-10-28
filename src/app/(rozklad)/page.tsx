import { OfflineHome } from "@/components/offline-home";
import { PageShell } from "@/components/page-shell";
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
  const plusValidUntil =
    plus !== "unavailable" &&
    (plus.state === "active" || plus.state === "trial")
      ? (plus.validUntil ?? null)
      : null;

  return (
    <PageShell wide roomy header={<SiteHeader current="rozklad" />}>
      <div className="page-enter">
        <OfflineHome
          schedule={schedule}
          freshness={freshness}
          mzkAvailable={Boolean(mzkMeta)}
          accountPlans={accountPlans}
          plusAccess={plusAccess}
          plusValidUntil={plusValidUntil}
        />
      </div>
    </PageShell>
  );
}
