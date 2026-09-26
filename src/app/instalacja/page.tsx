import { InstallGuide } from "@/components/install-guide";
import { InstallPhoneMock } from "@/components/install-phone-mock";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Aplikacja na telefonie lub tablecie",
  description:
    "Co daje aplikacja na telefonie: ikona na ekranie początkowym, przypomnienie 20 minut przed odjazdem i powrotem oraz wiadomość, gdy zmieni się rozkład. Instrukcja dla iPhone i Androida.",
  path: "/instalacja",
});

export default function InstalacjaPage() {
  return (
    <PageShell header={<SiteHeader current="instalacja" />}>
      <div className="page-enter">
        <header className="mb-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_auto] lg:gap-14">
          <div className="space-y-4">
            <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
              Aplikacja na telefonie lub tablecie{" "}
              <span className="inline-flex translate-y-[-0.12em] items-center rounded-md border border-border px-2 py-0.5 align-middle text-xs font-semibold leading-none tracking-wide text-muted-foreground">
                Beta
              </span>
            </h1>
            <div className="max-w-xl space-y-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              <p>
                Dodaj aplikację do ekranu telefonu i korzystaj z niej jak z
                normalnej aplikacji. Ustaw plan lekcji, a powiadomienia
                przypomną Ci o nadchodzących dowozach i odwozach — zanim
                dziecko będzie musiało wyjść z domu lub szkoły.
              </p>
              <p>Raz ustawiasz plan. Aplikacja pamięta za Ciebie.</p>
              <p>
                Aplikacja wymaga połączenia z internetem — nie działa w trybie
                offline.
              </p>
            </div>
          </div>
          <InstallPhoneMock />
        </header>

        <InstallGuide />
      </div>
    </PageShell>
  );
}
