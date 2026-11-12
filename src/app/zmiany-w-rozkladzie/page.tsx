import { OfflineZmiany } from "@/components/offline-zmiany";
import { PageEyebrow } from "@/components/page-eyebrow";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";
import { loadScheduleCorrectionSnapshot } from "@/lib/dowozy/load-schedule";
import { resolveServerSchoolContext } from "@/lib/schools/resolve-server";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "Zmiany w rozkładzie",
  description:
    "Podgląd tymczasowej korekty rozkładu dowozów — różnice względem oficjalnego rozkładu ze strony szkoły.",
  path: "/zmiany-w-rozkladzie",
});

type ZmianySearchParams = Record<string, string | string[] | undefined>;

export default async function ZmianyWRozkladziePage({
  searchParams,
}: {
  searchParams: Promise<ZmianySearchParams>;
}) {
  const params = await searchParams;
  const { selection } = await resolveServerSchoolContext(params);
  const correction = await loadScheduleCorrectionSnapshot(selection.schoolId);

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

        <OfflineZmiany correction={correction} />
      </div>
    </PageShell>
  );
}
