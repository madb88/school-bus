const MONTHS_PL: Record<string, number> = {
  stycznia: 0,
  lutego: 1,
  marca: 2,
  kwietnia: 3,
  maja: 4,
  czerwca: 5,
  lipca: 6,
  sierpnia: 7,
  września: 8,
  października: 9,
  listopada: 10,
  grudnia: 11,
};

export const WEEKDAYS_PL = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
] as const;

/** Calendar day in Europe/Warsaw, e.g. "2026-09-29". */
export type AbsoluteYmd = string;

export type ScheduleDateFilter =
  | "all"
  | "today"
  | "tomorrow"
  | AbsoluteYmd;

const ABSOLUTE_YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarDayParts = {
  year: number;
  month: number;
  day: number;
  weekday: number;
};

export type SchoolDayOption = {
  ymd: AbsoluteYmd;
  weekday: number;
  label: string;
};

export function extractYearFromPeriod(periodLabel: string): number {
  const match = periodLabel.match(/(\d{4})/);
  if (match) return Number(match[1]);
  return new Date().getFullYear();
}

/** Calendar parts in Europe/Warsaw for an instant. */
export function getWarsawParts(date: Date = new Date()): CalendarDayParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value) - 1;
  const day = Number(parts.find((p) => p.type === "day")?.value);

  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return { year, month, day, weekday: map[wd] ?? 1 };
}

export function addCalendarDays(
  parts: { year: number; month: number; day: number },
  days: number,
): CalendarDayParts {
  const utc = new Date(Date.UTC(parts.year, parts.month, parts.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth(),
    day: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
}

export function toAbsoluteYmd(parts: {
  year: number;
  month: number;
  day: number;
}): AbsoluteYmd {
  const m = String(parts.month + 1).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${parts.year}-${m}-${d}`;
}

/** Compact GTFS-style YYYYMMDD for MZK service calendars. */
export function toCompactYmd(parts: {
  year: number;
  month: number;
  day: number;
}): string {
  const m = String(parts.month + 1).padStart(2, "0");
  const d = String(parts.day).padStart(2, "0");
  return `${parts.year}${m}${d}`;
}

export function partsFromYmd(ymd: AbsoluteYmd): CalendarDayParts | null {
  const match = ABSOLUTE_YMD_RE.exec(ymd);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parts = addCalendarDays({ year, month, day }, 0);
  if (parts.year !== year || parts.month !== month || parts.day !== day) {
    return null;
  }
  return parts;
}

export function isAbsoluteDateFilter(
  filter: ScheduleDateFilter,
): filter is AbsoluteYmd {
  return typeof filter === "string" && ABSOLUTE_YMD_RE.test(filter);
}

export function parseAbsoluteYmd(value: string): AbsoluteYmd | null {
  const trimmed = value.trim();
  if (!ABSOLUTE_YMD_RE.test(trimmed)) return null;
  return partsFromYmd(trimmed) ? trimmed : null;
}

export function formatDayOptionLabel(parts: CalendarDayParts): string {
  const name = WEEKDAYS_PL[parts.weekday] ?? "Dzień";
  const dd = String(parts.day).padStart(2, "0");
  const mm = String(parts.month + 1).padStart(2, "0");
  return `${name} (${dd}.${mm})`;
}

/** Next Monday on/after `now` (today when already Monday). */
export function nextMonday(now: Date = new Date()): CalendarDayParts {
  const today = getWarsawParts(now);
  const daysUntil = (1 - today.weekday + 7) % 7;
  return addCalendarDays(today, daysUntil);
}

/** Upcoming Mon–Fri days starting from today (Warsaw). */
export function listUpcomingSchoolDays(
  now: Date = new Date(),
  count = 5,
): SchoolDayOption[] {
  const options: SchoolDayOption[] = [];
  let cursor = getWarsawParts(now);
  for (let i = 0; i < 21 && options.length < count; i++) {
    if (isSchoolDay(cursor.weekday)) {
      options.push({
        ymd: toAbsoluteYmd(cursor),
        weekday: cursor.weekday,
        label: formatDayOptionLabel(cursor),
      });
    }
    cursor = addCalendarDays(cursor, 1);
  }
  return options;
}

export function resolveTargetDay(
  filter: ScheduleDateFilter,
  now: Date = new Date(),
): CalendarDayParts | null {
  if (filter === "all") return null;
  if (isAbsoluteDateFilter(filter)) {
    return partsFromYmd(filter);
  }
  const today = getWarsawParts(now);
  return filter === "today" ? today : addCalendarDays(today, 1);
}

export function parsePolishDateLabel(
  dateLabel: string,
  fallbackYear: number,
): { year: number; month: number; day: number; weekdayName: string } | null {
  const normalized = dateLabel.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(
    /^([^,]+),\s*(\d{1,2})\s+([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/u,
  );
  if (!match) return null;

  const weekdayName = match[1].trim();
  const day = Number(match[2]);
  const month = MONTHS_PL[match[3].toLowerCase()];
  if (month === undefined || !Number.isFinite(day)) return null;

  return { year: fallbackYear, month, day, weekdayName };
}

export function dateLabelMatchesTarget(
  dateLabel: string,
  target: { year: number; month: number; day: number; weekday: number },
  periodYear: number,
): boolean {
  const parsed = parsePolishDateLabel(dateLabel, periodYear);
  if (
    parsed &&
    parsed.year === target.year &&
    parsed.month === target.month &&
    parsed.day === target.day
  ) {
    return true;
  }

  // Fallback: same weekday name (posted week as a repeating template).
  const weekdayName = WEEKDAYS_PL[target.weekday];
  const labelWeekday = dateLabel.split(",")[0]?.trim();
  return Boolean(weekdayName && labelWeekday === weekdayName);
}

export function isSchoolDay(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

export function courseAllowedOnWeekday(
  note: string | undefined,
  weekday: number,
): boolean {
  if (!note) return true;
  const n = note.toLowerCase();
  const fromMonday =
    n.includes("poniedziałek") || n.includes("poniedziałku");
  if (fromMonday && n.includes("czwartku")) {
    return weekday >= 1 && weekday <= 4;
  }
  if (fromMonday && (n.includes("piątek") || n.includes("piątku"))) {
    return isSchoolDay(weekday);
  }
  return true;
}
