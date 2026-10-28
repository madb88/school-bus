import Link from "next/link";
import { cn } from "cn";
import { AlertTriangle, Info, WifiOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { FreshnessInfo, FreshnessLevel } from "@/lib/schedule-freshness";

type ScheduleStatusBannerProps = {
  items: FreshnessInfo[];
  className?: string;
};

function rowIcon(level: FreshnessLevel) {
  if (level === "offline") return WifiOff;
  if (level === "expired") return AlertTriangle;
  return Info;
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

  const isAlert = warnings.some(
    (item) => item.level === "expired" || item.level === "offline",
  );
  const rows = [...warnings, ...notices];

  return (
    <div
      role="status"
      className={cn(
        "space-y-2 border-l-2 px-3 py-2 text-sm leading-snug md:px-4 md:py-3 md:leading-relaxed",
        isAlert
          ? "border-destructive/60 bg-destructive/10 text-destructive dark:bg-destructive/15"
          : "border-bus/40 bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      {rows.map((item) => {
        const Icon = rowIcon(item.level);
        const isRowAlert =
          item.level === "expired" || item.level === "offline";
        const titleClass = isRowAlert
          ? "font-medium text-destructive"
          : item.level === "ok"
            ? "text-muted-foreground"
            : "text-foreground/80";
        const detailClass = isRowAlert
          ? "text-destructive/80"
          : "text-muted-foreground/90";
        const compactTitle = item.messageCompact ?? item.message;
        const compactDetail = item.detailCompact ?? item.detail;

        return (
          <div key={item.message} className="flex items-start gap-2 md:gap-2.5">
            <Icon
              aria-hidden
              className={cn(
                "mt-0.5 size-3.5 shrink-0 md:mt-0 md:size-4",
                isRowAlert ? "text-destructive" : "text-bus",
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
                <Link
                  href={item.cta.href}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-fit",
                  )}
                >
                  {item.cta.label}
                </Link>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
