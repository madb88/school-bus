import type { Metadata } from "next";
import { OfflineFallbackApp } from "@/components/offline-fallback-app";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Tryb offline",
    description:
      "Lokalna kopia rozkładu dostępna bez połączenia z internetem (Plan Plus).",
    path: "/offline",
  }),
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <PageShell wide roomy header={<SiteHeader current="rozklad" />}>
      <div className="page-enter">
        <OfflineFallbackApp />
      </div>
    </PageShell>
  );
}
