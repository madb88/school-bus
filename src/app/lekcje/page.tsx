import { OfflineLekcje } from "@/components/offline-lekcje";
import { PageEyebrow } from "@/components/page-eyebrow";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { fetchPlus } from "@/lib/auth/backend";
import { getAuthSession } from "@/lib/auth/current-user";
import { hasPlusAccess, isPastTrialWindow } from "@/lib/billing/access";
import {
  MAX_ACCOUNT_PLANS,
  MAX_FREE_ACCOUNT_PLANS,
} from "@/lib/billing/constants";
import { collectPlaces } from "@/lib/dowozy/filter-schedule";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { loadMzkScheduleSnapshot } from "@/lib/mzk/load-schedule";
import { loadSchoolPlaces, loadSchools } from "@/lib/schools/load";
import { resolveServerSchoolContextForPlan } from "@/lib/schools/resolve-server";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Plan lekcji",
  description:
    "Zapisz godziny startu i końca lekcji dziecka, żeby rozkład dopasował dowozy i odwozy.",
  path: "/lekcje",
});

type LekcjeSearchParams = Record<string, string | string[] | undefined>;

export default async function LekcjePage({
  searchParams,
}: {
  searchParams: Promise<LekcjeSearchParams>;
}) {
  const params = await searchParams;
  const session = await getAuthSession();
  const user = session.status === "authenticated" ? session.user : null;
  const accountPlans = user?.plans ?? [];
  // `?plan=<id>` edits that plan: load its school's places.
  const { selection, cities, schools } =
    await resolveServerSchoolContextForPlan(params, accountPlans);
  const schoolId = selection.schoolId;
  const rawPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const urlPlanId = rawPlan?.trim().toLowerCase() || null;

  const [loaded, mzkSchedule, apiPlaces, allSchools] = await Promise.all([
    loadScheduleSnapshot(schoolId),
    loadMzkScheduleSnapshot(schoolId),
    loadSchoolPlaces(schoolId),
    loadSchools(),
  ]);
  const suspendOfflineSync = session.status === "unavailable";
  const schedule = loaded?.schedule ?? null;
  const places =
    apiPlaces.length > 0
      ? apiPlaces
      : schedule
        ? collectPlaces(schedule)
        : [];

  const plus = user ? await fetchPlus(user.sessionToken) : "unavailable";
  const offlinePlusAccess = user != null && hasPlusAccess(user.role, plus);
  // Signed in: plans live on the account (one without Plus, up to five with).
  const mode = user != null ? "account" : "local";
  const maxPlans = offlinePlusAccess ? MAX_ACCOUNT_PLANS : MAX_FREE_ACCOUNT_PLANS;
  const trialEnded =
    user != null && !offlinePlusAccess && isPastTrialWindow(user.createdAt);
  const plusValidUntil =
    plus !== "unavailable" &&
    (plus.state === "active" || plus.state === "trial")
      ? (plus.validUntil ?? null)
      : null;

  const accountDefaults = user?.settings
    ? {
        cityId: user.settings.defaultCityId ?? null,
        schoolId: user.settings.defaultSchoolId ?? null,
      }
    : null;

  return (
    <PageShell header={<SiteHeader current="lekcje" />}>
      <div className="page-enter">
        <header className="mb-10 space-y-3 print:hidden">
          <PageEyebrow>Plan lekcji</PageEyebrow>
          <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
            Plan lekcji
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Ustaw godziny lekcji dziecka, a aplikacja dopasuje do nich dowóz do
            szkoły i powrót do domu.
          </p>
        </header>

        <OfflineLekcje
          schedule={schedule}
          mzkSchedule={mzkSchedule}
          places={places}
          mode={mode}
          initialPlans={accountPlans}
          maxPlans={maxPlans}
          urlPlanId={urlPlanId}
          loggedIn={user != null}
          trialEnded={trialEnded}
          plusAccess={offlinePlusAccess}
          offlinePlusAccess={offlinePlusAccess}
          plusValidUntil={plusValidUntil}
          suspendOfflineSync={suspendOfflineSync}
          cities={cities}
          schools={schools}
          allSchools={allSchools}
          cityId={selection.cityId}
          schoolId={schoolId}
          accountDefaults={accountDefaults}
        />
      </div>
    </PageShell>
  );
}
