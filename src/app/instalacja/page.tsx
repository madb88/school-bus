import { InstallGuide } from "@/components/install-guide";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Instalacja",
  description:
    "Jak dodać Dojazdy do szkoły na iPhone, iPada i Androida oraz włączyć przypomnienia o kursie.",
  path: "/instalacja",
});

export default function InstalacjaPage() {
  return (
    <PageShell>
      <div className="mb-8">
        <SiteHeader current="instalacja" />
      </div>

      <header className="animate-rise-delay mb-10 space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Instalacja
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Dodaj aplikację na telefon. Otwiera się z ekranu początkowego, a
          przypomnienie o kursie włączysz po ustawieniu planu lekcji.
        </p>
      </header>

      <InstallGuide />
    </PageShell>
  );
}
