import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Clock,
  FilterX,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatTripCount } from "@/components/schedule/labels";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

export type DirectionEmptyKind = "window" | "filters" | "none";

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
    <div className="mb-3 flex items-start justify-between gap-3 border-b border-border/40 pb-2.5 print:mb-2 print:pb-2">
      <div className="min-w-0">
        <h2
          id={id}
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-asphalt sm:text-xl print:text-base"
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
  className,
}: {
  headingId: string;
  title: string;
  subtitle: string;
  tripCount: number;
  icon: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "schedule-direction-section -mx-6 min-w-0 rounded-none border border-border/60 border-x-0 bg-card p-3 sm:-mx-10 sm:p-4 lg:mx-0 lg:rounded-xl lg:border-x lg:shadow-[0_1px_2px_color-mix(in_srgb,var(--foreground)_4%,transparent)] print:mx-0 print:break-inside-avoid print:rounded-none print:border-x print:p-2 print:shadow-none dark:lg:shadow-[0_1px_2px_rgba(0,0,0,0.35)]",
        className,
      )}
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

/**
 * Mobile-first empty state for a direction card (window / filters / none).
 * Priority of kinds is decided by the caller (window → filters → none).
 */
export function DirectionEmptyState({
  kind,
  windowMin,
  onChangeWindow,
  onClearFilters,
}: {
  kind: DirectionEmptyKind;
  windowMin?: number;
  onChangeWindow?: () => void;
  onClearFilters?: () => void;
}) {
  const Icon =
    kind === "window"
      ? CalendarClock
      : kind === "filters"
        ? FilterX
        : CalendarDays;

  const description =
    kind === "window"
      ? `W pobliżu wybranej godziny nie ma kursów. Sprawdź szerszy zakres czasu (±${windowMin ?? "?"} min).`
      : kind === "filters"
        ? "Dla wybranych filtrów nie ma kursów w tym kierunku. Spróbuj wyczyścić filtry."
        : "W rozkładzie nie ma kursów w tym kierunku na wybrany dzień.";

  const ActionIcon = kind === "window" ? Clock : FilterX;
  const actionLabel =
    kind === "window"
      ? "Zmień okno czasowe"
      : kind === "filters"
        ? "Wyczyść filtry"
        : null;
  const onAction =
    kind === "window"
      ? onChangeWindow
      : kind === "filters"
        ? onClearFilters
        : undefined;

  const actionButton = actionLabel && onAction ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn(
        "border-bus/30 text-bus-deep hover:bg-bus/10 hover:text-bus-deep",
        // Mobile: full-width row button; desktop: centered pill
        "mt-3 h-10 w-full justify-between rounded-xl bg-card px-3.5",
        "md:mt-4 md:h-9 md:w-auto md:justify-center md:self-center md:rounded-full md:bg-transparent md:px-4",
      )}
      onClick={onAction}
    >
      <span className="inline-flex items-center gap-2">
        <ActionIcon aria-hidden className="size-3.5" />
        {actionLabel}
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 opacity-70 md:size-3.5"
      />
    </Button>
  ) : null;

  return (
    <div className="rounded-xl bg-bus/[0.06] p-3.5 dark:bg-bus/10 md:flex md:flex-col md:items-center md:rounded-2xl md:px-5 md:py-6 md:text-center">
      {/* Mobile: icon + copy in a row */}
      <div className="flex items-start gap-3 md:hidden">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-bus/10 text-bus dark:bg-bus/15">
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-display text-[0.9375rem] font-semibold tracking-tight text-asphalt dark:text-foreground">
            Nie znaleziono kursów
          </p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {/* Desktop: centered stack */}
      <div className="hidden flex-col items-center md:flex">
        <span className="flex size-11 items-center justify-center rounded-full bg-bus/10 text-bus dark:bg-bus/15">
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="mt-3 font-display text-base font-semibold tracking-tight text-asphalt dark:text-foreground">
          Nie znaleziono kursów
        </p>
        <p className="mt-1 max-w-[18rem] text-sm leading-snug text-muted-foreground">
          {description}
        </p>
      </div>

      {actionButton}
    </div>
  );
}
