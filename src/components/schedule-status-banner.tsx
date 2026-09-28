import { cn } from "cn";
import { AlertTriangle, Info } from "lucide-react";
import type { FreshnessInfo } from "@/lib/schedule-freshness";

type ScheduleStatusBannerProps = {
  items: FreshnessInfo[];
  className?: string;
};

export function ScheduleStatusBanner({
  items,
  className,
}: ScheduleStatusBannerProps) {
  const visible = items.filter((item) => item.message);
  const warnings = visible.filter((item) => item.level !== "ok");
  // Allow level "ok" rows that still carry a message (e.g. override matches source).
  const notices = visible.filter((item) => item.level === "ok" && item.message);
  if (warnings.length === 0 && notices.length === 0) return null;

  const isExpired = warnings.some((item) => item.level === "expired");
  const rows = [...warnings, ...notices];

  return (
    <div
      role="status"
      className={cn(
        "space-y-2 border-l-2 px-3 py-2 text-sm leading-snug md:px-4 md:py-3 md:leading-relaxed",
        isExpired
          ? "border-destructive/50 bg-destructive/5 text-destructive"
          : "border-bus/40 bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      {rows.map((item) => {
        const Icon = item.level === "expired" ? AlertTriangle : Info;
        const titleClass =
          item.level === "expired"
            ? "text-destructive"
            : item.level === "ok"
              ? "text-muted-foreground"
              : "text-foreground/80";
        const compactTitle = item.messageCompact ?? item.message;
        const compactDetail = item.detailCompact ?? item.detail;

        return (
          <div key={item.message} className="flex items-start gap-2 md:gap-2.5">
            <Icon
              aria-hidden
              className={cn(
                "mt-0.5 size-3.5 shrink-0 md:mt-0 md:size-4",
                item.level === "expired" ? "text-destructive" : "text-bus",
              )}
            />
            <div className="min-w-0 space-y-0.5">
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
                <p className="text-xs leading-snug text-muted-foreground/90 md:hidden">
                  {compactDetail}
                </p>
              ) : null}
              {item.detail ? (
                <p className="hidden text-xs text-muted-foreground/90 md:block">
                  {item.detail}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
