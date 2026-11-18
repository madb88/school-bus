import { OfflineLekcje } from "@/components/offline-lekcje";
import { PageEyebrow } from "@/components/page-eyebrow";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { fetchPlus } from "@/lib/auth/backend";
import { getAuthSession } from "@/lib/auth/current-user";
import { hasPlusAccess, isPastTrialWindow } from "@/lib/billing/access";
import { collectPlaces } from "@/lib/dowozy/filter-schedule";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { loadMzkScheduleSnapshot } from "@/lib/mzk/load-schedule";
import { loadSchoolPlaces } from "@/lib/schools/load";
import { resolveServerSchoolContext } from "@/lib/schools/resolve-server";
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
  const { selection, cities, schools } =
    await resolveServerSchoolContext(params);
  const schoolId = selection.schoolId;

  const [loaded, mzkSchedule, session, apiPlaces] = await Promise.all([
    loadScheduleSnapshot(schoolId),
    loadMzkScheduleSnapshot(schoolId),
    getAuthSession(),
    loadSchoolPlaces(schoolId),
  ]);
  const user = session.status === "authenticated" ? session.user : null;
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
  const plusAccess =
    offlinePlusAccess || (user != null && user.plans.length > 0);
  const mode = plusAccess ? "account" : "local";
  const trialEnded =
    user != null && !plusAccess && isPastTrialWindow(user.createdAt);
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
          initialPlans={plusAccess && user ? user.plans : []}
          loggedIn={user != null}
          trialEnded={trialEnded}
          plusAccess={plusAccess}
          offlinePlusAccess={offlinePlusAccess}
          plusValidUntil={plusValidUntil}
          suspendOfflineSync={suspendOfflineSync}
          cities={cities}
          schools={schools}
          cityId={selection.cityId}
          schoolId={schoolId}
          accountDefaults={accountDefaults}
        />
      </div>
    </PageShell>
  );
}
