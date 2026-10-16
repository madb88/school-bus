import { AboutProject } from "@/components/about-project";
import { PageShell } from "@/components/page-shell";
import { ScheduleDataSources } from "@/components/schedule-data-sources";
import { SiteHeader } from "@/components/site-header";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata = buildPageMetadata({
  title: "O projekcie",
  description:
    "Czym jest autobusszkolny.pl, po co powstał, co już oferuje i w jakim kierunku się rozwija — prosto i bez marketingowego nadęcia.",
  path: "/o-projekcie",
});

export default function AboutProjectPage() {
  return (
    <PageShell header={<SiteHeader current="o-projekcie" />}>
      <div className="page-enter">
        <AboutProject dataSources={<ScheduleDataSources />} />
      </div>
    </PageShell>
  );
}
