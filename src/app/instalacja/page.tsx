import { InstallGuide } from "@/components/install-guide";
import { InstallNotifications } from "@/components/install-notifications";
import { InstallPhoneMock } from "@/components/install-phone-mock";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Instalacja",
  description:
    "Co daje aplikacja na telefonie: ikona na ekranie początkowym i przypomnienie przed Twoim kursem. Instrukcja dla iPhone i Androida.",
  path: "/instalacja",
});

export default function InstalacjaPage() {
  return (
    <PageShell>
      <div className="mb-8">
        <SiteHeader current="instalacja" />
      </div>

      <header className="animate-rise-delay mb-14 grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_auto] lg:gap-14">
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
            Instalacja
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Aplikacja dostaje własną ikonę i otwiera się bez paska przeglądarki.
            Po ustawieniu planu lekcji możesz włączyć przypomnienie — przyjdzie
            około 15 minut przed Twoim kursem, tylko na tym telefonie.
          </p>
          <InstallNotifications />
        </div>
        <InstallPhoneMock />
      </header>

      <InstallGuide />
    </PageShell>
  );
}
