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
        "space-y-2 border-l-2 px-4 py-3 text-sm leading-relaxed",
        isExpired
          ? "border-destructive/50 bg-destructive/5 text-destructive"
          : "border-bus/40 bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      {rows.map((item) => {
        const Icon = item.level === "expired" ? AlertTriangle : Info;
        return (
          <div key={item.message} className="flex items-center gap-2.5">
            <Icon
              aria-hidden
              className={cn(
                "size-4 shrink-0",
                item.level === "expired"
                  ? "text-destructive"
                  : "text-bus",
              )}
            />
            <div className="min-w-0 space-y-0.5">
              <p
                title={item.detail}
                className={
                  item.level === "expired"
                    ? "text-destructive"
                    : item.level === "ok"
                      ? "text-muted-foreground"
                      : "text-foreground/80"
                }
              >
                {item.message}
              </p>
              {item.detail ? (
                <p className="text-xs text-muted-foreground/90">{item.detail}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
