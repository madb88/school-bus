import { PageShell } from "@/components/page-shell";
import { PrivacyPolicyContent } from "@/components/privacy-policy-content";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Polityka prywatności",
  description:
    "Jak Dojazdy do szkoły przetwarzają dane: plan lekcji na urządzeniu, opcjonalne powiadomienia, transfer ustawień, formularz opinii i statystyki.",
  path: "/polityka-prywatnosci",
});

export default function PolitykaPrywatnosciPage() {
  return (
    <PageShell>
      <div className="mb-8">
        <SiteHeader current="o-aplikacji" />
      </div>

      <header className="animate-rise-delay mb-10 space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Polityka prywatności
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Bez powiadomień — Twój plan pozostaje na Twoim urządzeniu. Po
          włączeniu powiadomień część danych planu jest przechowywana na
          serwerze, ponieważ jest to konieczne do wysyłania spersonalizowanych
          powiadomień.
        </p>
      </header>

      <PrivacyPolicyContent />
    </PageShell>
  );
}
