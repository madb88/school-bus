"use client";

import { cn } from "cn";
import { AlertTriangle, Info, WifiOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useOnlineStatus } from "@/lib/offline/use-online-status";
import type { FreshnessInfo, FreshnessLevel } from "@/lib/schedule-freshness";

export const OFFLINE_ZMIANY_HASH = "#zmiany" as const;

type ScheduleStatusBannerProps = {
  items: FreshnessInfo[];
  className?: string;
};

function rowIcon(level: FreshnessLevel) {
  if (level === "offline") return WifiOff;
  if (level === "expired") return AlertTriangle;
  return Info;
}

function isZmianyHref(href: string): boolean {
  try {
    return new URL(href, "https://local.invalid").pathname === "/zmiany-w-rozkladzie";
  } catch {
    return href.includes("zmiany-w-rozkladzie");
  }
}

function BannerCta({ href, label }: { href: string; label: string }) {
  const online = useOnlineStatus();
  const className = cn(
    buttonVariants({ variant: "outline", size: "sm" }),
    "w-fit",
  );

  // Offline: stay on the already-loaded rozkład shell and show the diff from IDB.
  // Soft/hard nav to /zmiany-w-rozkladzie needs page chunks that may not be cached yet.
  if (!online && isZmianyHref(href)) {
    return (
      <a
        href={`/${OFFLINE_ZMIANY_HASH}`}
        className={className}
        onClick={(event) => {
          const path = window.location.pathname;
          if (path === "/" || path === "/offline") {
            event.preventDefault();
            if (window.location.hash !== OFFLINE_ZMIANY_HASH) {
              window.location.hash = OFFLINE_ZMIANY_HASH.slice(1);
            } else {
              window.dispatchEvent(new Event("hashchange"));
            }
          }
        }}
      >
        {label}
      </a>
    );
  }

  return (
    <a href={href} className={className}>
      {label}
    </a>
  );
}

export function ScheduleStatusBanner({
  items,
  className,
}: ScheduleStatusBannerProps) {
  const visible = items.filter((item) => item.message);
  const warnings = visible.filter((item) => item.level !== "ok");
  // Allow level "ok" rows that still carry a message (e.g. override matches source).
  const notices = visible.filter((item) => item.level === "ok" && item.message);
  if (warnings.length === 0 && notices.length === 0) return null;

  const rows = [...warnings, ...notices];

  return (
    <div role="status" className={cn("space-y-2", className)}>
      {rows.map((item) => {
        const Icon = rowIcon(item.level);
        // Only expired/offline use alert chrome. Schedule corrections stay "stale" (bus).
        const isAlert =
          item.level === "expired" || item.level === "offline";
        const titleClass = isAlert
          ? "font-medium text-destructive"
          : item.level === "ok"
            ? "text-muted-foreground"
            : "text-foreground/80";
        const detailClass = isAlert
          ? "text-destructive/80"
          : "text-muted-foreground/90";
        const compactTitle = item.messageCompact ?? item.message;
        const compactDetail = item.detailCompact ?? item.detail;

        return (
          <div
            key={item.message}
            className={cn(
              "flex items-start gap-2 border-l-2 px-3 py-2 text-sm leading-snug md:gap-2.5 md:px-4 md:py-3 md:leading-relaxed",
              isAlert
                ? "border-destructive/50 bg-destructive/5 text-destructive"
                : "border-bus/40 bg-muted/40 text-muted-foreground",
            )}
          >
            <Icon
              aria-hidden
              className={cn(
                "mt-0.5 size-3.5 shrink-0 md:mt-0 md:size-4",
                isAlert ? "text-destructive" : "text-bus",
              )}
            />
            <div className="min-w-0 space-y-1.5">
              <div className="space-y-0.5">
                <p title={item.detail} className={cn("md:hidden", titleClass)}>
                  {compactTitle}
                </p>
                <p
                  title={item.detail}
                  className={cn("hidden md:block", titleClass)}
                >
                  {item.message}
                </p>
                {compactDetail ? (
                  <p className={cn("text-xs leading-snug md:hidden", detailClass)}>
                    {compactDetail}
                  </p>
                ) : null}
                {item.detail ? (
                  <p className={cn("hidden text-xs md:block", detailClass)}>
                    {item.detail}
                  </p>
                ) : null}
              </div>
              {item.cta ? (
                <BannerCta href={item.cta.href} label={item.cta.label} />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
