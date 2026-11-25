import { OfflineHome } from "@/components/offline-home";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { fetchPlus } from "@/lib/auth/backend";
import { getAuthSession } from "@/lib/auth/current-user";
import { hasPlusAccess } from "@/lib/billing/access";
import { loadScheduleCorrectionSnapshot } from "@/lib/dowozy/load-schedule";
import { overrideFreshnessInfo } from "@/lib/dowozy/override-freshness";
import { loadMzkScheduleMeta } from "@/lib/mzk/load-schedule";
import { loadSchoolNotices, loadSchools } from "@/lib/schools/load";
import { resolveServerSchoolContextForPlan } from "@/lib/schools/resolve-server";
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
  const session = await getAuthSession();
  const user = session.status === "authenticated" ? session.user : null;
  // `?plan=<id>` of one of the user's plans picks the plan's school.
  const { selection, cities, schools, school } =
    await resolveServerSchoolContextForPlan(params, user?.plans ?? []);
  const schoolId = selection.schoolId;

  const [correction, mzkMeta, notices, allSchools] = await Promise.all([
    loadScheduleCorrectionSnapshot(schoolId),
    loadMzkScheduleMeta(schoolId),
    loadSchoolNotices(schoolId),
    loadSchools(),
  ]);
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
  // The backend already limits the plans shown without Plus (one plan).
  const accountPlans = user ? user.plans : [];
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
  const signedIn = user != null;
  const visibleSchoolIds = user?.settings.visibleSchoolIds ?? null;

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
          allSchools={allSchools}
          cityId={selection.cityId}
          schoolId={schoolId}
          schoolName={school?.name ?? null}
          accountDefaults={accountDefaults}
          signedIn={signedIn}
          visibleSchoolIds={visibleSchoolIds}
          notices={notices}
        />
      </div>
    </PageShell>
  );
}
