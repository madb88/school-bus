/** Decorative mini preview of the weekly commute printout for the about page. */
export function AboutPrintMock() {
  const days = ["Pn", "Wt", "Śr", "Cz", "Pt"] as const;
  const lessons = ["8:00–13:25", "8:00–14:15", "8:55–13:25", "8:00–12:30", "8:00–13:25"];
  const departures = ["7:12", "7:12", "7:48", "7:12", "7:12"];
  const returns = ["13:45", "14:45", "13:45", "12:50", "13:45"];

  const cell =
    "border border-bus/25 px-1 py-1.5 text-center tabular-nums text-[0.6rem] leading-tight text-asphalt sm:px-1.5 sm:text-[0.65rem]";
  const label =
    "border border-bus/25 px-1.5 py-1.5 text-left text-[0.6rem] font-semibold whitespace-nowrap text-asphalt sm:text-[0.65rem]";

  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-bus/30 bg-card shadow-[0_12px_40px_-18px_color-mix(in_srgb,var(--bus)_45%,transparent)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-bus/25 bg-gradient-to-br from-bus/18 via-bus/8 to-transparent px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="text-[0.55rem] font-medium tracking-[0.14em] text-bus-deep uppercase">
            Plan dojazdów · szkolny
          </p>
          <p className="mt-0.5 truncate font-display text-sm font-bold tracking-tight text-asphalt">
            Osiedle Słoneczne
          </p>
        </div>
        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-bus/40 bg-bus text-bus-foreground shadow-sm">
          <svg
            viewBox="0 0 24 24"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="6" width="18" height="11" rx="2" />
            <path d="M7 17v2M17 17v2M3 12h18M7 9h2M15 9h2" />
          </svg>
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <table className="w-full table-fixed border-collapse overflow-hidden rounded-md">
          <thead>
            <tr>
              <th className={`${label} w-[3.5rem] bg-bus/12 sm:w-[4rem]`} />
              {days.map((day) => (
                <th
                  key={day}
                  className={`${cell} bg-bus/12 font-semibold text-bus-deep`}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className={`${label} bg-muted/50`}>
                Lekcje
              </th>
              {lessons.map((value, i) => (
                <td key={days[i]} className={`${cell} bg-muted/30 text-muted-foreground`}>
                  {value}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={`${label} bg-bus/10 text-bus-deep`}>
                Wyjazd
              </th>
              {departures.map((value, i) => (
                <td
                  key={days[i]}
                  className={`${cell} bg-bus/8 font-semibold text-bus-deep`}
                >
                  {value}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={`${label} bg-mzk/10 text-mzk-deep`}>
                Powrót
              </th>
              {returns.map((value, i) => (
                <td
                  key={days[i]}
                  className={`${cell} border-mzk/25 bg-mzk/8 font-semibold text-mzk-deep`}
                >
                  {value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-center gap-2.5 rounded-md bg-gradient-to-r from-bus/5 via-mzk/5 to-bus/5 px-2 py-2">
          <span className="grid size-8 place-items-center rounded-md border border-bus/30 bg-background shadow-sm">
            <span className="size-5 bg-[repeating-linear-gradient(90deg,var(--bus)_0_1px,transparent_1px_3px),repeating-linear-gradient(0deg,var(--bus)_0_1px,transparent_1px_3px)]" />
          </span>
          <span className="text-[0.55rem] font-medium tracking-wide text-bus-deep">
            autobusszkolny.pl/lekcje
          </span>
        </div>
      </div>
    </div>
  );
}
