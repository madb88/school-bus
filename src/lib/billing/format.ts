import { getWarsawParts, partsFromYmd } from "@/lib/dowozy/schedule-dates";

const MONTHS_GENITIVE = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
] as const;

export function formatPolishYmd(ymd: string): string | null {
  const parts = partsFromYmd(ymd);
  if (!parts) return null;
  const month = MONTHS_GENITIVE[parts.month];
  if (!month) return null;
  return `${parts.day} ${month} ${parts.year}`;
}

/** Whole calendar months from Warsaw today to validUntil (0 if under a month). */
export function remainingWholeMonths(validUntil: string, now: Date): number | null {
  const end = partsFromYmd(validUntil);
  if (!end) return null;
  const today = getWarsawParts(now);
  const months = (end.year - today.year) * 12 + (end.month - today.month);
  return Math.max(0, months);
}

/** Polish label for remaining time until validUntil, e.g. "11 miesięcy". */
export function formatRemainingMonthsLabel(
  validUntil: string,
  now: Date = new Date(),
): string | null {
  const months = remainingWholeMonths(validUntil, now);
  if (months === null) return null;
  if (months === 0) return "mniej niż miesiąc";
  const mod10 = months % 10;
  const mod100 = months % 100;
  if (months === 1) return "1 miesiąc";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${months} miesiące`;
  }
  return `${months} miesięcy`;
}

/** Inclusive calendar days from Warsaw today to validUntil (0 if already past). */
export function remainingWholeDays(validUntil: string, now: Date): number | null {
  const end = partsFromYmd(validUntil);
  if (!end) return null;
  const today = getWarsawParts(now);
  const startUtc = Date.UTC(today.year, today.month, today.day);
  const endUtc = Date.UTC(end.year, end.month, end.day);
  return Math.max(0, Math.round((endUtc - startUtc) / 86_400_000));
}

/** Polish label for remaining days, e.g. "Pozostało 5 dni". */
export function formatRemainingDaysLabel(
  validUntil: string,
  now: Date = new Date(),
): string | null {
  const days = remainingWholeDays(validUntil, now);
  if (days === null) return null;
  if (days === 0) return "Pozostało mniej niż dzień";
  if (days === 1) return "Pozostał 1 dzień";
  return `Pozostało ${days} dni`;
}
