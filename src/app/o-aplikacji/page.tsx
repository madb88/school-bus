import { AboutGuide } from "@/components/about-guide";
import { AboutIntro } from "@/components/about-intro";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "O projekcie",
  description:
    "Podaj plan lekcji, a pokażemy którym autobusem dziecko pojedzie do szkoły i czym wróci. Możesz dodać MZK, wydrukować plan dojazdów i włączyć przypomnienia.",
  path: "/o-aplikacji",
});

export default function AboutPage() {
  return (
    <PageShell header={<SiteHeader current="o-aplikacji" />}>
      <div className="page-enter">
        <AboutIntro />
        <AboutGuide />
      </div>
    </PageShell>
  );
}
