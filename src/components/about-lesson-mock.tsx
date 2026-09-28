/** Decorative mini preview of the lesson plan form for the about page. */
export function AboutLessonMock() {
  const days = [
    { label: "Poniedziałek", start: "8:00", end: "13:25" },
    { label: "Wtorek", start: "8:00", end: "14:15" },
    { label: "Środa", start: "8:55", end: "13:25" },
    { label: "Czwartek", start: "8:00", end: "12:30" },
    { label: "Piątek", start: "8:00", end: "13:25" },
  ] as const;

  return (
    <div
      aria-hidden
      className="w-full min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card shadow-[0_12px_40px_-20px_color-mix(in_srgb,var(--foreground)_28%,transparent)] dark:shadow-[0_10px_28px_-20px_rgba(0,0,0,0.5)]"
    >
      <div className="border-b border-border/60 px-3 py-2.5 sm:px-4">
        <p className="font-display text-sm font-semibold tracking-tight text-asphalt sm:text-base">
          Plan lekcji
        </p>
        <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
          Miejsce · Osiedle Słoneczne
        </p>
      </div>

      <div className="min-w-0 overflow-hidden border-b border-border/60">
        <div className="hidden border-b border-border/60 px-3 py-2 text-[0.6rem] font-medium tracking-wide text-muted-foreground uppercase sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-3 sm:px-4">
          <span>Dzień</span>
          <span>Start</span>
          <span>Koniec</span>
        </div>
        <div className="divide-y divide-border/40">
          {days.map((day) => (
            <div
              key={day.label}
              className="grid grid-cols-[minmax(0,1.2fr)_auto_auto] items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:gap-3 sm:px-4"
            >
              <span className="truncate text-xs font-medium text-asphalt sm:text-sm">
                {day.label}
              </span>
              <span className="rounded-md border border-border/70 bg-background px-2 py-1 text-center font-display text-xs font-semibold tabular-nums text-asphalt sm:text-sm">
                {day.start}
              </span>
              <span className="rounded-md border border-border/70 bg-background px-2 py-1 text-center font-display text-xs font-semibold tabular-nums text-asphalt sm:text-sm">
                {day.end}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
        <span className="inline-flex h-9 items-center rounded-lg bg-bus px-3 text-xs font-medium text-bus-foreground">
          Zapisz plan
        </span>
        <span className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground">
          Wyczyść
        </span>
      </div>
    </div>
  );
}
