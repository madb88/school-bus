import { ArrowRight, Bus } from "lucide-react";

/** Decorative mini preview of the MZK route form for the about page. */
export function AboutMzkMock() {
  return (
    <div
      aria-hidden
      className="w-full min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_12px_40px_-20px_color-mix(in_srgb,var(--foreground)_28%,transparent)] dark:shadow-[0_10px_28px_-20px_rgba(0,0,0,0.5)]"
    >
      <div className="border-b border-border/60 px-3 py-2.5 sm:px-4">
        <p className="font-display text-sm font-semibold tracking-tight text-asphalt sm:text-base">
          Trasa MZK
        </p>
        <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
          Autobus miejski obok szkolnego
        </p>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-3">
          <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
            <p className="text-[0.6rem] font-semibold tracking-wide text-muted-foreground uppercase">
              Z domu
            </p>
            <p className="mt-1 truncate text-xs font-medium text-foreground sm:text-sm">
              Przystanek Centrum
            </p>
          </div>
          <span className="hidden text-muted-foreground sm:flex sm:justify-center">
            <ArrowRight className="size-4" />
          </span>
          <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5">
            <p className="text-[0.6rem] font-semibold tracking-wide text-muted-foreground uppercase">
              Do szkoły
            </p>
            <p className="mt-1 truncate text-xs font-medium text-foreground sm:text-sm">
              Szkoła Podstawowa
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-mzk/15 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-mzk-deep uppercase">
            <Bus className="size-3" strokeWidth={2.5} />
            Linia 12
          </span>
          <span className="text-[0.65rem] text-muted-foreground">
            Najbliższe: 7:18 · 7:33 · 7:48
          </span>
        </div>

        <ul className="space-y-1.5 rounded-xl border border-border/60 bg-background/70 p-2.5">
          <li className="flex items-center gap-2 text-xs text-foreground">
            <span className="size-1.5 shrink-0 rounded-full bg-mzk" />
            <span className="min-w-0 truncate">Przystanek Centrum</span>
            <span className="ml-auto font-display text-xs font-semibold tabular-nums text-asphalt">
              7:18
            </span>
          </li>
          <li className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 shrink-0 rounded-full bg-border" />
            <span className="min-w-0 truncate">Osiedle · sklep</span>
          </li>
          <li className="flex items-center gap-2 text-xs text-foreground">
            <span className="size-1.5 shrink-0 rounded-full bg-mzk" />
            <span className="min-w-0 truncate">Szkoła Podstawowa</span>
            <span className="ml-auto font-display text-xs font-semibold tabular-nums text-asphalt">
              7:26
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
