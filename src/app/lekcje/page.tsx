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
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Plan lekcji",
  description:
    "Zapisz godziny startu i końca lekcji dziecka, żeby rozkład dopasował dowozy i odwozy.",
  path: "/lekcje",
});

export default async function LekcjePage() {
  const [loaded, mzkSchedule, session] = await Promise.all([
    loadScheduleSnapshot(),
    loadMzkScheduleSnapshot(),
    getAuthSession(),
  ]);
  const user = session.status === "authenticated" ? session.user : null;
  const suspendOfflineSync = session.status === "unavailable";
  const schedule = loaded?.schedule ?? null;
  const places = schedule ? collectPlaces(schedule) : [];

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
        />
      </div>
    </PageShell>
  );
}
