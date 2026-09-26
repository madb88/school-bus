import { SettingsRestorePanel } from "@/components/settings-restore-panel";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";
import { normalizeTransferToken } from "@/lib/settings-transfer/token";

export const metadata = buildPageMetadata({
  title: "Przywróć ustawienia",
  description:
    "Odbierz plan lekcji i trasę MZK z drugiego urządzenia za pomocą kodu QR lub kodu tekstowego.",
  path: "/przywroc",
});

type PrzywrocPageProps = {
  searchParams: Promise<{ t?: string; code?: string }>;
};

export default async function PrzywrocPage({ searchParams }: PrzywrocPageProps) {
  const params = await searchParams;
  const initialToken = normalizeTransferToken(params.t ?? params.code ?? "");

  return (
    <PageShell header={<SiteHeader current="lekcje" />}>
      <div className="page-enter">
        <header className="mb-10 space-y-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
            Przywróć ustawienia
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Odbierz plan lekcji i trasę MZK wygenerowane na innym urządzeniu.
            Kod jest jednorazowy i działa przez krótki czas.
          </p>
        </header>

        <SettingsRestorePanel initialToken={initialToken} />
      </div>
    </PageShell>
  );
}
