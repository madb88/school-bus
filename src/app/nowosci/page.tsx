import { NewsList } from "@/components/news-list";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Nowości",
  description:
    "Co nowego w Dojazdach do szkoły — wydruk planu dojazdów i kolejne usprawnienia.",
  path: "/nowosci",
});

export default function NowosciPage() {
  return (
    <PageShell>
      <div className="mb-8">
        <SiteHeader current="nowosci" />
      </div>

      <header className="animate-rise-delay mb-10 space-y-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Nowości
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Krótko o nowych funkcjach i zmianach w aplikacji.
        </p>
      </header>

      <NewsList />
    </PageShell>
  );
}
