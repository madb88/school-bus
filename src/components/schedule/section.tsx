import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatTripCount } from "@/components/schedule/labels";
import { cn } from "cn";

export function SectionHeading({
  id,
  title,
  subtitle,
  tripCount,
  icon: Icon,
  iconClassName,
}: {
  id: string;
  title: string;
  subtitle: string;
  tripCount: number;
  icon: LucideIcon;
  iconClassName?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3 border-b border-border/50 pb-3 print:mb-2 print:pb-2">
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-asphalt sm:text-xl print:text-base"
        >
          <Icon
            className={cn("size-5 shrink-0 print:size-4", iconClassName)}
            aria-hidden
          />
          <span className="min-w-0 truncate">{title}</span>
        </h2>
        <p className="mt-0.5 pl-7 text-xs text-muted-foreground print:pl-6">
          {subtitle}
        </p>
      </div>
      <span className="shrink-0 pt-1 text-xs font-medium tabular-nums text-muted-foreground">
        {formatTripCount(tripCount)}
      </span>
    </div>
  );
}

export function DirectionSection({
  headingId,
  title,
  subtitle,
  tripCount,
  icon,
  iconClassName,
  children,
}: {
  headingId: string;
  title: string;
  subtitle: string;
  tripCount: number;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className="schedule-direction-section min-w-0 rounded-xl border border-border/70 bg-card/90 p-3 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:p-4 print:break-inside-avoid print:p-2 print:shadow-none dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]"
    >
      <SectionHeading
        id={headingId}
        title={title}
        subtitle={subtitle}
        tripCount={tripCount}
        icon={icon}
        iconClassName={iconClassName}
      />
      {children}
    </section>
  );
}
