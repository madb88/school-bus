import { PageEyebrow } from "@/components/page-eyebrow";
import { PageShell } from "@/components/page-shell";
import { ScheduleChangesContent } from "@/components/schedule-changes-content";
import { SiteHeader } from "@/components/site-header";
import { loadScheduleCorrectionSnapshot } from "@/lib/dowozy/load-schedule";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Zmiany w rozkładzie",
  description:
    "Podgląd tymczasowej korekty rozkładu dowozów — różnice względem oficjalnego rozkładu ze strony szkoły.",
  path: "/zmiany-w-rozkladzie",
});

export default async function ZmianyWRozkladziePage() {
  const correction = await loadScheduleCorrectionSnapshot();

  return (
    <PageShell header={<SiteHeader />}>
      <div className="page-enter">
        <header className="mb-8 space-y-3 sm:mb-10">
          <PageEyebrow>Rozkład</PageEyebrow>
          <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
            Zmiany w rozkładzie
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Porównanie tymczasowej korekty z oficjalnym rozkładem dowozów.
          </p>
        </header>

        <ScheduleChangesContent correction={correction} />
      </div>
    </PageShell>
  );
}
