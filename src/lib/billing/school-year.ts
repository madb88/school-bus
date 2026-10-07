import { getWarsawParts, partsFromYmd, toAbsoluteYmd } from "@/lib/dowozy/schedule-dates";

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

/**
 * Plan Plus lasts until 31 August.
 * 1 Sep–30 Jun → that school year's 31 Aug (Sep 2026 → 2027-08-31).
 * 1 Jul–31 Aug → 31 Aug of the next calendar year, so late summer is not a few weeks.
 * The calendar day is Europe/Warsaw.
 */
export function plusValidUntil(purchaseAt: Date): string {
  const { year, month } = getWarsawParts(purchaseAt);
  const endYear = month >= 6 ? year + 1 : year;
  return `${endYear}-08-31`;
}

export function isPlusRenewal(
  purchaseAt: Date,
  current: { status: "active" | "revoked"; validUntil: string } | null,
): boolean {
  return (
    current?.status === "active" &&
    isActiveUntil(current.validUntil, purchaseAt) &&
    partsFromYmd(current.validUntil) !== null
  );
}

/**
 * A new payment while Plus is still active adds one school year: the next 31 August.
 * An expired or missing plan uses the purchase date alone.
 */
export function nextPlusValidUntil(
  purchaseAt: Date,
  current: { status: "active" | "revoked"; validUntil: string } | null,
): string {
  if (!isPlusRenewal(purchaseAt, current) || !current) return plusValidUntil(purchaseAt);
  const parts = partsFromYmd(current.validUntil);
  if (!parts) return plusValidUntil(purchaseAt);
  return `${parts.year + 1}-08-31`;
}

export function warsawToday(now: Date): string {
  return toAbsoluteYmd(getWarsawParts(now));
}

/** Inclusive: active through the Warsaw calendar day of validUntil. */
export function isActiveUntil(validUntil: string, now: Date): boolean {
  return validUntil >= warsawToday(now);
}

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
  const months =
    (end.year - today.year) * 12 + (end.month - today.month);
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
