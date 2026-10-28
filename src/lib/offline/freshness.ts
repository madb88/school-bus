import type { FreshnessInfo } from "@/lib/schedule-freshness";

function formatCachedAtLabel(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Warsaw",
    }).format(date);
  } catch {
    return null;
  }
}

/** Banner row when the device is offline or serving a Plus offline snapshot. */
export function offlineConnectivityFreshness(
  cachedAt?: string | null,
): FreshnessInfo {
  const when = cachedAt ? formatCachedAtLabel(cachedAt) : null;
  return {
    level: "stale",
    message: when
      ? `Brak połączenia z internetem — rozkład może być nieaktualny (dane z ${when}).`
      : "Brak połączenia z internetem — rozkład może być nieaktualny.",
    messageCompact: when
      ? `Brak internetu — dane z ${when}`
      : "Brak internetu — rozkład może być nieaktualny",
    detail:
      "Korzystasz z kopii zapisanej na tym urządzeniu (Plan Plus). Połącz się z siecią, aby pobrać aktualny rozkład.",
    detailCompact: "Kopia lokalna (Plan Plus). Połącz się, by odświeżyć.",
  };
}
