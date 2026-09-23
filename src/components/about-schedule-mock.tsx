/** Decorative mini preview of the schedule board for the about page. */
export function AboutScheduleMock() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-[0_12px_40px_-20px_color-mix(in_srgb,var(--asphalt)_35%,transparent)] backdrop-blur-sm"
    >
      <div className="flex flex-wrap gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2.5">
        <span className="rounded-md bg-background px-2 py-1 text-[0.65rem] font-medium text-asphalt ring-1 ring-border/80">
          Szkolny + MZK
        </span>
        <span className="rounded-md bg-bus/15 px-2 py-1 text-[0.65rem] font-medium text-bus-deep">
          Do planu lekcji
        </span>
        <span className="rounded-md bg-background/70 px-2 py-1 text-[0.65rem] text-muted-foreground ring-1 ring-border/50">
          Dziś
        </span>
        <span className="rounded-md bg-background/70 px-2 py-1 text-[0.65rem] text-muted-foreground ring-1 ring-border/50">
          Dowozy
        </span>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
        <div>
          <p className="mb-2 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Dowozy · Rano / do szkoły
          </p>
          <ul className="space-y-2">
            <li className="relative grid grid-cols-[3.25rem_1fr] gap-2 border-l-2 border-bus bg-bus/12 py-2 pr-2 pl-2.5 -ml-px rounded-r-md">
              <span className="absolute top-2.5 -left-1 size-1.5 rounded-full bg-bus" />
              <span className="font-display text-sm font-semibold tabular-nums text-asphalt">
                7:12
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  Osiedle Słoneczne
                </p>
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                  Najbliższy · bus szkolny
                </p>
              </div>
            </li>
            <li className="grid grid-cols-[3.25rem_1fr] gap-2 border-l-2 border-mzk/45 bg-mzk/4 py-2 pl-2.5">
              <span className="font-display text-sm font-semibold tabular-nums text-asphalt">
                7:18
              </span>
              <div className="min-w-0">
                <span className="mb-0.5 inline-flex items-center rounded-md bg-mzk/15 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-mzk-deep uppercase">
                  MZK 12
                </span>
                <p className="truncate text-xs font-medium text-foreground">
                  Przystanek Centrum → Szkoła
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Odwozy · Po lekcjach
          </p>
          <ul className="space-y-2">
            <li className="grid grid-cols-[3.25rem_1fr] gap-2 border-l-2 border-bus/45 bg-bus/3 py-2 pl-2.5">
              <span className="font-display text-sm font-semibold tabular-nums text-asphalt">
                14:45
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  Szkoła → Osiedle Słoneczne
                </p>
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                  bus szkolny
                </p>
              </div>
            </li>
            <li className="grid grid-cols-[3.25rem_1fr] gap-2 border-l-2 border-mzk/45 bg-mzk/4 py-2 pl-2.5">
              <span className="font-display text-sm font-semibold tabular-nums text-asphalt">
                14:52
              </span>
              <div className="min-w-0">
                <span className="mb-0.5 inline-flex items-center rounded-md bg-mzk/15 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-mzk-deep uppercase">
                  MZK 12
                </span>
                <p className="truncate text-xs font-medium text-foreground">
                  Szkoła → Przystanek Centrum
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
