/** Decorative mini preview of the schedule board for the about page. */
export function AboutScheduleMock() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-[0_12px_40px_-20px_color-mix(in_srgb,var(--foreground)_35%,transparent)] dark:shadow-[0_10px_28px_-20px_rgba(0,0,0,0.5)]"
    >
      <div className="flex flex-wrap gap-1.5 border-b border-border/50 bg-muted/30 px-3 py-2.5">
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
          Do szkoły
        </span>
      </div>

      <div className="space-y-4 p-3 sm:p-4">
        <div>
          <p className="mb-1.5 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Do szkoły · Rano
          </p>
          <ul className="relative before:absolute before:top-2 before:bottom-2 before:left-[calc(3.25rem+0.5rem+0.375rem)] before:w-px before:bg-border/70 before:content-[''] dark:before:bg-border/55">
            <li className="relative flex gap-2 py-1.5">
              <span className="w-[3.25rem] shrink-0 font-display text-sm font-semibold tabular-nums text-asphalt">
                7:12
              </span>
              <span className="relative w-3 shrink-0">
                <span className="absolute top-1 left-1/2 z-10 flex size-[9px] -translate-x-1/2 items-center justify-center rounded-full bg-card">
                  <span className="size-1.5 rounded-full bg-bus" />
                </span>
              </span>
              <div className="min-w-0">
                <span className="mb-0.5 inline-flex items-center rounded-md bg-bus/15 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-bus-deep uppercase">
                  Szkolny
                </span>
                <p className="truncate text-xs font-medium text-foreground">
                  Osiedle Słoneczne
                </p>
                <p className="mt-0.5 text-[0.65rem] text-bus-deep">Najbliższy</p>
              </div>
            </li>
            <li className="relative flex gap-2 py-1.5">
              <span className="w-[3.25rem] shrink-0 font-display text-sm font-semibold tabular-nums text-asphalt">
                7:18
              </span>
              <span className="relative w-3 shrink-0">
                <span className="absolute top-1 left-1/2 z-10 flex size-[9px] -translate-x-1/2 items-center justify-center rounded-full bg-card">
                  <span className="size-1.5 rounded-full bg-mzk" />
                </span>
              </span>
              <div className="min-w-0">
                <span className="mb-0.5 inline-flex items-center rounded-md bg-mzk/15 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-mzk-deep uppercase">
                  MZK 12
                </span>
                <p className="truncate text-xs text-muted-foreground">
                  Przystanek Centrum → Szkoła
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-1.5 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
            Ze szkoły · Po lekcjach
          </p>
          <ul className="relative before:absolute before:top-2 before:bottom-2 before:left-[calc(3.25rem+0.5rem+0.375rem)] before:w-px before:bg-border/70 before:content-[''] dark:before:bg-border/55">
            <li className="relative flex gap-2 py-1.5">
              <span className="w-[3.25rem] shrink-0 font-display text-sm font-semibold tabular-nums text-asphalt">
                14:45
              </span>
              <span className="relative w-3 shrink-0">
                <span className="absolute top-1 left-1/2 z-10 flex size-[9px] -translate-x-1/2 items-center justify-center rounded-full bg-card">
                  <span className="size-1.5 rounded-full bg-bus" />
                </span>
              </span>
              <div className="min-w-0">
                <span className="mb-0.5 inline-flex items-center rounded-md bg-bus/15 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-bus-deep uppercase">
                  Szkolny
                </span>
                <p className="truncate text-xs text-foreground">
                  Osiedle Słoneczne
                </p>
              </div>
            </li>
            <li className="relative flex gap-2 py-1.5">
              <span className="w-[3.25rem] shrink-0 font-display text-sm font-semibold tabular-nums text-asphalt">
                14:52
              </span>
              <span className="relative w-3 shrink-0">
                <span className="absolute top-1 left-1/2 z-10 flex size-[9px] -translate-x-1/2 items-center justify-center rounded-full bg-card">
                  <span className="size-1.5 rounded-full bg-mzk" />
                </span>
              </span>
              <div className="min-w-0">
                <span className="mb-0.5 inline-flex items-center rounded-md bg-mzk/15 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-mzk-deep uppercase">
                  MZK 12
                </span>
                <p className="truncate text-xs text-muted-foreground">
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
