import { AboutGuide } from "@/components/about-guide";
import { AboutIntro } from "@/components/about-intro";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "O aplikacji",
  description:
    "Jak zacząć: ustaw plan lekcji i trasę MZK, wydrukuj spersonalizowany plan dojazdów, potem korzystaj z dopasowanego rozkładu.",
  path: "/o-aplikacji",
});

export default function AboutPage() {
  return (
    <PageShell>
      <div className="mb-8">
        <SiteHeader current="o-aplikacji" />
      </div>

      <div className="page-enter">
        <AboutIntro />
        <AboutGuide />
      </div>
    </PageShell>
  );
}
