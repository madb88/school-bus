type WeekendPlaceholderProps = {
  day: "today" | "tomorrow";
};

export function WeekendPlaceholder({ day }: WeekendPlaceholderProps) {
  const title =
    day === "tomorrow" ? "Jutro jest weekend" : "Dzisiaj jest weekend";

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
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
        W weekendy autobusy szkolne nie kursują, dlatego nie wyświetlamy
        rozkładu jazdy.
      </p>
    </div>
  );
}
