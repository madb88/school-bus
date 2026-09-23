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

const WEEKDAYS_PL = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
] as const;

export type ScheduleDateFilter = "all" | "today" | "tomorrow";

export function extractYearFromPeriod(periodLabel: string): number {
  const match = periodLabel.match(/(\d{4})/);
  if (match) return Number(match[1]);
  return new Date().getFullYear();
}

/** Calendar parts in Europe/Warsaw for an instant. */
export function getWarsawParts(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  weekday: number;
} {
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
): { year: number; month: number; day: number; weekday: number } {
  const utc = new Date(Date.UTC(parts.year, parts.month, parts.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth(),
    day: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
}

export function resolveTargetDay(
  filter: ScheduleDateFilter,
  now: Date = new Date(),
): { year: number; month: number; day: number; weekday: number } | null {
  if (filter === "all") return null;
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
