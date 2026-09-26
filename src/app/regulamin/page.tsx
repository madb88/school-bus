import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { TermsOfServiceContent } from "@/components/terms-of-service-content";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Regulamin",
  description:
    "Regulamin świadczenia usług drogą elektroniczną Serwisu AutobusSzkolny.pl — rozkłady, plan lekcji, transfer ustawień, powiadomienia i zasady korzystania.",
  path: "/regulamin",
});

export default function RegulaminPage() {
  return (
    <PageShell header={<SiteHeader current="o-aplikacji" />}>
      <header className="animate-rise-delay mb-10 space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Regulamin
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Zasady korzystania z serwisu informacyjnego Dojazdy do szkoły —
          rozkładów, planu lekcji i funkcji opcjonalnych. Nie jesteśmy
          przewoźnikiem ani organizatorem transportu.
        </p>
      </header>

      <TermsOfServiceContent />
    </PageShell>
  );
}
