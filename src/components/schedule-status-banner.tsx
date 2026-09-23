import { cn } from "cn";
import type { FreshnessInfo } from "@/lib/schedule-freshness";

type ScheduleStatusBannerProps = {
  items: FreshnessInfo[];
  className?: string;
};

export function ScheduleStatusBanner({
  items,
  className,
}: ScheduleStatusBannerProps) {
  const warnings = items.filter((item) => item.level !== "ok" && item.message);
  if (warnings.length === 0) return null;

  const isExpired = warnings.some((item) => item.level === "expired");

  return (
    <div
      role="status"
      className={cn(
        "space-y-1 border-l-2 px-4 py-3 text-sm leading-relaxed",
        isExpired
          ? "border-destructive/50 bg-destructive/5 text-destructive"
          : "border-bus/40 bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      {warnings.map((item) => (
        <p
          key={item.message}
          className={isExpired ? "text-destructive" : "text-foreground/80"}
        >
          {item.message}
        </p>
      ))}
    </div>
  );
}
