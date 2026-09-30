import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageEyebrow } from "@/components/page-eyebrow";
import { PageShell } from "@/components/page-shell";
import { ProfilePanel } from "@/components/profile-panel";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { rememberPaymentReturn } from "@/lib/billing/store";
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
  searchParams: Promise<{ paid?: string; plus?: string; powiadomienia?: string }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const paid = params.paid === "1";
  const plus = await loadPlusPanel(user.userId, paid);

  if (paid && plus.state === "active") redirect("/profil?plus=1");
  if (paid && plus.state === "pending") {
    const remembered = await rememberPaymentReturn(user.userId);
    if (remembered) redirect("/profil");
  }

  const focusNotifications = params.powiadomienia === "1";
  const focusPlus =
    params.plus === "1" || plus.state === "pending" || plus.state === "unknown";

  return (
    <PageShell header={<SiteHeader />}>
      <div className="page-enter">
        <header className="mb-10 space-y-3">
          <PageEyebrow>Konto</PageEyebrow>
          <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
            Profil
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Konto na tym urządzeniu i Plan Plus.
          </p>
        </header>

        <ProfilePanel
          email={user.email}
          plus={plus}
          focusPlus={focusPlus}
          focusNotifications={focusNotifications}
          pushUiEnabled={isPushNotificationsUiEnabled()}
        />
      </div>
    </PageShell>
  );
}
