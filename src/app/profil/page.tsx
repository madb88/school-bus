import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageEyebrow } from "@/components/page-eyebrow";
import { PageShell } from "@/components/page-shell";
import { ProfilePanel } from "@/components/profile-panel";
import { SiteHeader } from "@/components/site-header";
import { rememberPaymentReturn } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadPlusPanel } from "@/lib/billing/status";
import { isPushNotificationsUiEnabled } from "@/lib/push/feature";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Profil",
    description: "Konto i Plan Plus w autobusszkolny.pl na tym urządzeniu.",
    path: "/profil",
  }),
  robots: { index: false, follow: false },
};

type ProfilePageProps = {
  searchParams: Promise<{
    paid?: string;
    plus?: string;
    powiadomienia?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const paid = params.paid === "1";

  if (paid) {
    const status = await rememberPaymentReturn(user.sessionToken);
    if (status !== "unavailable" && status.state === "active") {
      redirect("/profil?plus=1");
    }
    redirect("/profil");
  }

  const plus = await loadPlusPanel(user.sessionToken);

  const focusNotifications = params.powiadomienia === "1";
  const focusPlus =
    params.plus === "1" || plus.state === "pending" || plus.state === "unknown";
  const sectionHint = focusNotifications
    ? ("powiadomienia" as const)
    : params.plus === "1"
      ? ("plus" as const)
      : null;

  return (
    <PageShell wide header={<SiteHeader />}>
      <div className="page-enter">
        <header className="mb-4 space-y-3 sm:mb-10">
          <PageEyebrow>Konto</PageEyebrow>
        </header>

        <ProfilePanel
          userId={user.userId}
          email={user.email}
          role={user.role}
          createdAt={user.createdAt}
          plus={plus}
          plans={user.plans}
          focusPlus={focusPlus}
          focusNotifications={focusNotifications}
          sectionHint={sectionHint}
          pushUiEnabled={isPushNotificationsUiEnabled()}
        />
      </div>
    </PageShell>
  );
}
