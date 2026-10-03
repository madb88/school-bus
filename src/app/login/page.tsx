import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/account-panel";
import { PageEyebrow } from "@/components/page-eyebrow";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Logowanie",
    description: "Zaloguj się adresem e-mail do konta w autobusszkolny.pl.",
    path: "/login",
  }),
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ login?: string }>;
};

function loginStatus(value: string | undefined): "invalid" | "unavailable" | null {
  if (value === "invalid" || value === "unavailable") return value;
  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/profil");

  const params = await searchParams;

  return (
    <PageShell header={<SiteHeader />}>
      <div className="page-enter">
        <header className="mb-10 space-y-3">
          <PageEyebrow>Konto</PageEyebrow>
          <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
            Zaloguj się
          </h1>
          <div className="max-w-xl space-y-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            <p>
              Zaloguj się adresem e-mail — bez hasła. Wyślemy jednorazowy link
              i 6-cyfrowy kod, ważne 15 minut.
            </p>
            <p>
              Wpisz kod w aplikacji z ekranu głównego na tym urządzeniu. Link z
              maila otwiera przeglądarkę, a to osobne logowanie.
            </p>
          </div>
        </header>

        <AccountPanel loginStatus={loginStatus(params.login)} />
      </div>
    </PageShell>
  );
}
