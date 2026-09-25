import { getWarsawParts } from "@/lib/dowozy/schedule-dates";

export type FreshnessLevel = "ok" | "stale" | "expired";

export type FreshnessInfo = {
  level: FreshnessLevel;
  /** Short Polish sentence for banners. */
  message: string;
};

/** GTFS fetch also runs once daily. */
const MZK_STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
/** Warn when the published GTFS feed ends within this many days. */
const MZK_FEED_END_WARN_DAYS = 14;

function warsawYmd(now: Date = new Date()): string {
  const { year, month, day } = getWarsawParts(now);
  return `${year}${String(month + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

function parseFetchedAt(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function schoolScheduleFreshness(fetchedAt: string): FreshnessInfo {
  const fetched = parseFetchedAt(fetchedAt);
  if (!fetched) {
    return {
      level: "stale",
      message: "Nie udało się odczytać daty aktualizacji rozkładu szkolnego.",
    };
  }

  return { level: "ok", message: "" };
}

export function mzkScheduleFreshness(
  fetchedAt: string,
  feedEndDate: string,
  now: Date = new Date(),
): FreshnessInfo {
  const today = warsawYmd(now);
  const end = feedEndDate.trim();

  if (/^\d{8}$/.test(end) && today > end) {
    return {
      level: "expired",
      message:
        "Opublikowany rozkład MZK już wygasł — połączenia mogą być nieaktualne.",
    };
  }

  if (/^\d{8}$/.test(end)) {
    const endY = Number(end.slice(0, 4));
    const endM = Number(end.slice(4, 6)) - 1;
    const endD = Number(end.slice(6, 8));
    const endUtc = Date.UTC(endY, endM, endD);
    const { year, month, day } = getWarsawParts(now);
    const todayUtc = Date.UTC(year, month, day);
    const daysLeft = Math.round((endUtc - todayUtc) / (24 * 60 * 60 * 1000));
    if (daysLeft >= 0 && daysLeft <= MZK_FEED_END_WARN_DAYS) {
      const when =
        daysLeft === 0
          ? "dziś"
          : daysLeft === 1
            ? "jutro"
            : `za ${daysLeft} dni`;
      return {
        level: "stale",
        message: `Rozkład MZK kończy się ${when} — wkrótce może zostać wymieniony.`,
      };
    }
  }

  const fetched = parseFetchedAt(fetchedAt);
  if (!fetched) {
    return {
      level: "stale",
      message: "Nie udało się odczytać daty aktualizacji rozkładu MZK.",
    };
  }

  const age = now.getTime() - fetched.getTime();
  if (age > MZK_STALE_AFTER_MS) {
    return {
      level: "stale",
      message:
        "Rozkład MZK może być nieaktualny — ostatnia aktualizacja była ponad 3 dni temu.",
    };
  }

  return { level: "ok", message: "" };
}
