import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { SiteHeader } from "@/components/site-header";

/** Immediate feedback while the Rozkład RSC payload is preparing. */
export default function HomeLoading() {
  return (
    <PageShell wide header={<SiteHeader current="rozklad" />}>
      <div
        className="flex min-h-[14rem] flex-col items-center justify-center gap-2.5"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2 className="size-5 animate-spin text-bus" aria-hidden />
        <span className="text-xs text-muted-foreground">
          Ładowanie rozkładu…
        </span>
      </div>
    </PageShell>
  );
}
