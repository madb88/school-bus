import { OfflineHome } from "@/components/offline-home";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { fetchPlus } from "@/lib/auth/backend";
import { getAuthSession } from "@/lib/auth/current-user";
import { hasPlusAccess } from "@/lib/billing/access";
import { loadScheduleCorrectionSnapshot } from "@/lib/dowozy/load-schedule";
import { overrideFreshnessInfo } from "@/lib/dowozy/override-freshness";
import { loadMzkScheduleMeta } from "@/lib/mzk/load-schedule";
import { loadSchoolNotices } from "@/lib/schools/load";
import { resolveServerSchoolContext } from "@/lib/schools/resolve-server";
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

type HomeSearchParams = Record<string, string | string[] | undefined>;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;
  const { selection, cities, schools, school } =
    await resolveServerSchoolContext(params);
  const schoolId = selection.schoolId;

  const [correction, mzkMeta, session, notices] = await Promise.all([
    loadScheduleCorrectionSnapshot(schoolId),
    loadMzkScheduleMeta(schoolId),
    getAuthSession(),
    loadSchoolNotices(schoolId),
  ]);
  const user = session.status === "authenticated" ? session.user : null;
  const suspendOfflineSync = session.status === "unavailable";
  const loaded = correction?.resolved ?? null;
  const schedule = loaded?.schedule ?? null;
  const freshness = [
    schedule ? schoolScheduleFreshness(schedule.fetchedAt) : null,
    loaded ? overrideFreshnessInfo(loaded) : null,
    mzkMeta
      ? mzkScheduleFreshness(mzkMeta.fetchedAt, mzkMeta.feedEndDate)
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  const plus = user ? await fetchPlus(user.sessionToken) : "unavailable";
  const offlinePlusAccess = user != null && hasPlusAccess(user.role, plus);
  const plusAccess =
    offlinePlusAccess || (user != null && user.plans.length > 0);
  const accountPlans = plusAccess && user ? user.plans : [];
  const plusValidUntil =
    plus !== "unavailable" &&
    (plus.state === "active" || plus.state === "trial")
      ? (plus.validUntil ?? null)
      : null;
  const offlineCorrection = correction
    ? {
        original: correction.original,
        modified: correction.modified,
        ...(correction.activeUntil && correction.modified
          ? { activeUntil: correction.activeUntil }
          : {}),
      }
    : null;

  const accountDefaults = user?.settings
    ? {
        cityId: user.settings.defaultCityId ?? null,
        schoolId: user.settings.defaultSchoolId ?? null,
      }
    : null;

  return (
    <PageShell wide roomy header={<SiteHeader current="rozklad" />}>
      <div className="page-enter">
        <OfflineHome
          schedule={schedule}
          freshness={freshness}
          mzkAvailable={Boolean(mzkMeta)}
          accountPlans={accountPlans}
          offlinePlusAccess={offlinePlusAccess}
          plusValidUntil={plusValidUntil}
          correction={offlineCorrection}
          suspendOfflineSync={suspendOfflineSync}
          cities={cities}
          schools={schools}
          cityId={selection.cityId}
          schoolId={schoolId}
          schoolName={school?.name ?? null}
          accountDefaults={accountDefaults}
          notices={notices}
        />
      </div>
    </PageShell>
  );
}
