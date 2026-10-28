import { WifiOff } from "lucide-react";
import { cn } from "cn";

type OfflineConnectivityBannerProps = {
  /** ISO timestamp or already formatted label. */
  cachedAt?: string | null;
  title?: string;
  detail?: string;
  className?: string;
};

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

function resolveCachedAtLabel(cachedAt?: string | null): string | null {
  if (!cachedAt) return null;
  if (cachedAt.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(cachedAt)) {
    return formatCachedAtLabel(cachedAt);
  }
  return cachedAt;
}

/** Standalone, high-contrast offline notice (not mixed into schedule freshness). */
export function OfflineConnectivityBanner({
  cachedAt,
  title,
  detail,
  className,
}: OfflineConnectivityBannerProps) {
  const when = resolveCachedAtLabel(cachedAt ?? null);
  const heading =
    title ??
    (when
      ? `Brak internetu — rozkład może być nieaktualny (dane z ${when})`
      : "Brak połączenia z internetem — rozkład może być nieaktualny");
  const body =
    detail ??
    "Korzystasz z kopii lokalnej (Plan Plus). Połącz się z siecią, aby odświeżyć dane.";

  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border-2 border-red-500/50 bg-red-500/15 px-3.5 py-3 text-red-900 shadow-sm dark:border-red-400/40 dark:bg-red-500/20 dark:text-red-50 md:gap-3.5 md:px-4 md:py-3.5",
        className,
      )}
    >
      <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white dark:bg-red-500">
        <WifiOff aria-hidden className="size-5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 space-y-1 pt-0.5">
        <p className="text-sm font-semibold leading-snug md:text-base">
          {heading}
        </p>
        <p className="text-xs leading-snug text-red-900/75 dark:text-red-50/80 md:text-sm">
          {body}
        </p>
      </div>
    </div>
  );
}
