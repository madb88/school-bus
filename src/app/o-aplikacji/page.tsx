import { AboutGuide } from "@/components/about-guide";
import { AboutIntro } from "@/components/about-intro";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Jak zacząć",
  description:
    "5 sposobów na korzystanie z autobusszkolny.pl — plan lekcji, wydruk dojazdów, trasa MZK, rozkład i wygodne funkcje na co dzień.",
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
