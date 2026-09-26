type WeekendMondayPreview = {
  weekdayName: string;
  lessonStart: string;
  busTime: string;
  onViewDay: () => void;
};

type WeekendPlaceholderProps = {
  mondayPreview?: WeekendMondayPreview | null;
};

export function WeekendPlaceholder({
  mondayPreview = null,
}: WeekendPlaceholderProps) {
  return (
    <div
      className="flex flex-col items-center px-4 py-6 text-center print:hidden"
      role="status"
    >
      <img
        src="/weekend-bus.svg"
        alt=""
        width={420}
        height={328}
        className="h-auto w-full max-w-56"
      />
      <h2 className="mt-6 font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
        W weekend odpoczywamy
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        Autobusy szkolne nie kursują w soboty i niedziele. Rozkład wróci w
        poniedziałek.
      </p>

      {mondayPreview ? (
        <div className="mt-6 w-full max-w-md rounded-2xl border border-border/80 bg-card px-4 py-4 text-left shadow-sm">
          <p className="font-display text-base font-semibold tracking-tight text-asphalt">
            {mondayPreview.weekdayName} już zaplanowany
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Pierwsza lekcja zaczyna się o {mondayPreview.lessonStart}.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Najbliższy pasujący autobus odjeżdża o {mondayPreview.busTime}.
          </p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-bus-deep underline-offset-2 hover:underline"
            onClick={mondayPreview.onViewDay}
          >
            Zobacz cały poniedziałek →
          </button>
        </div>
      ) : null}
    </div>
  );
}
