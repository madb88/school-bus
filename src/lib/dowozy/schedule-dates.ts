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

/** Fold Polish diacritics for weekday token matching. */
function foldPl(value: string): string {
  return value
    .toLowerCase()
    .replace(/ą/g, "a")
    .replace(/ć/g, "c")
    .replace(/ę/g, "e")
    .replace(/ł/g, "l")
    .replace(/ń/g, "n")
    .replace(/ó/g, "o")
    .replace(/ś/g, "s")
    .replace(/ź|ż/g, "z");
}

/**
 * Weekday name variants (nominative + common inflected) → JS weekday
 * (0 = Sunday … 6 = Saturday), longest names first to avoid partial hits.
 */
const WEEKDAY_NAME_VARIANTS: ReadonlyArray<{ weekday: number; name: string }> =
  [
    { weekday: 1, name: "poniedzialek" },
    { weekday: 1, name: "poniedzialku" },
    { weekday: 2, name: "wtorek" },
    { weekday: 2, name: "wtorku" },
    { weekday: 3, name: "sroda" },
    { weekday: 3, name: "srody" },
    { weekday: 3, name: "srode" },
    { weekday: 4, name: "czwartek" },
    { weekday: 4, name: "czwartku" },
    { weekday: 5, name: "piatek" },
    { weekday: 5, name: "piatku" },
    { weekday: 6, name: "sobota" },
    { weekday: 6, name: "soboty" },
    { weekday: 0, name: "niedziela" },
    { weekday: 0, name: "niedzieli" },
  ].sort((a, b) => b.name.length - a.name.length);

type WeekdayHit = { weekday: number; start: number; end: number };

function findWeekdayHits(foldedLabel: string): WeekdayHit[] {
  const hits: WeekdayHit[] = [];
  let cursor = 0;
  while (cursor < foldedLabel.length) {
    let matched: WeekdayHit | null = null;
    for (const variant of WEEKDAY_NAME_VARIANTS) {
      if (foldedLabel.startsWith(variant.name, cursor)) {
        matched = {
          weekday: variant.weekday,
          start: cursor,
          end: cursor + variant.name.length,
        };
        break;
      }
    }
    if (matched) {
      hits.push(matched);
      cursor = matched.end;
    } else {
      cursor += 1;
    }
  }
  return hits;
}

/** Text between two weekday hits that means an inclusive range (not a list). */
const WEEKDAY_RANGE_BETWEEN_RE = /^[\s–—\-]*(?:do)?[\s–—\-]*$/;

/**
 * Weekdays covered by a dropoff heading, e.g.
 * "Poniedziałek, wtorek i czwartek" → Mon/Tue/Thu,
 * "Odwozy – poniedziałek–piątek" → Mon–Fri.
 */
export function weekdaysFromDateLabel(dateLabel: string): number[] {
  const folded = foldPl(dateLabel.replace(/\u00a0/g, " "));
  const hits = findWeekdayHits(folded);
  if (!hits.length) return [];

  const weekdays = new Set<number>();
  for (const hit of hits) weekdays.add(hit.weekday);

  for (let i = 0; i < hits.length - 1; i++) {
    const left = hits[i];
    const right = hits[i + 1];
    const between = folded.slice(left.end, right.start);
    if (!WEEKDAY_RANGE_BETWEEN_RE.test(between)) continue;

    const from = Math.min(left.weekday, right.weekday);
    const to = Math.max(left.weekday, right.weekday);
    for (let day = from; day <= to; day++) weekdays.add(day);
  }

  return [...weekdays].sort((a, b) => a - b);
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

  // Template / multi-day headings: every weekday named in the label counts
  // ("Poniedziałek, wtorek i czwartek", "Środa", "poniedziałek–piątek").
  return weekdaysFromDateLabel(dateLabel).includes(target.weekday);
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
