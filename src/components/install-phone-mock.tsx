import Image from "next/image";

/** Decorative phone frame with a schedule screen, for the install page. */
export function InstallPhoneMock() {
  return (
    <div aria-hidden className="mx-auto w-[17.5rem] max-w-full">
      <div className="rounded-[2.4rem] bg-[#1a2433] p-2.5 shadow-[0_24px_50px_-24px_color-mix(in_srgb,var(--asphalt)_55%,transparent)]">
        <div className="overflow-hidden rounded-[1.85rem] bg-background">
          <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-[0.6rem] font-medium text-muted-foreground">
            <span className="tabular-nums">7:12</span>
            <span className="h-4 w-16 rounded-full bg-[#1a2433]" />
            <span>5G</span>
          </div>

          <div className="flex items-center gap-2 px-3.5 pt-1 pb-2.5">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={28}
              height={28}
              className="size-7 rounded-lg"
            />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold tracking-tight text-asphalt">
                Dojazdy do szkoły
              </p>
              <p className="text-[0.6rem] text-muted-foreground">Dziś · dowozy</p>
            </div>
          </div>

          <div className="mx-3 mb-3 rounded-xl border border-border/70 bg-card px-2.5 py-2 shadow-sm">
            <p className="text-[0.6rem] font-medium text-muted-foreground">
              Przypomnienie
            </p>
            <p className="mt-0.5 text-xs leading-snug font-medium text-foreground">
              Za 15 min · 7:12, Osiedle Słoneczne
            </p>
          </div>

          <div className="space-y-2 px-3 pb-4">
            <p className="text-[0.6rem] font-semibold tracking-wide text-muted-foreground uppercase">
              Dowozy
            </p>
            <div className="relative grid grid-cols-[2.6rem_1fr] gap-2 rounded-r-md border-l-2 border-bus bg-bus/12 py-1.5 pr-2 pl-2">
              <span className="absolute top-2.5 -left-1 size-1.5 rounded-full bg-bus" />
              <span className="font-display text-sm font-semibold tabular-nums text-asphalt">
                7:12
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  Osiedle Słoneczne
                </p>
                <p className="text-[0.6rem] text-muted-foreground">
                  Najbliższy · bus szkolny
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[2.6rem_1fr] gap-2 border-l-2 border-mzk/45 py-1.5 pl-2">
              <span className="font-display text-sm font-semibold tabular-nums text-asphalt">
                7:18
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  MZK 12 · Centrum
                </p>
                <p className="text-[0.6rem] text-muted-foreground">do szkoły</p>
              </div>
            </div>
            <div className="grid grid-cols-[2.6rem_1fr] gap-2 border-l-2 border-bus/40 py-1.5 pl-2">
              <span className="font-display text-sm font-semibold tabular-nums text-asphalt">
                14:45
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  Szkoła → Osiedle
                </p>
                <p className="text-[0.6rem] text-muted-foreground">odwóz</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
