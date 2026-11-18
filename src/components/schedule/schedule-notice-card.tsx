import {
  CalendarClock,
  CircleAlert,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import {
  formatPublicNoticeSpan,
  PUBLIC_NOTICE_KIND_LABELS,
} from "@/lib/schools/notices";
import type { PublicNotice, PublicNoticeKind } from "@/lib/schools/types";

const KIND_ICONS: Record<PublicNoticeKind, LucideIcon> = {
  info: Info,
  organizational: CalendarClock,
  urgent: CircleAlert,
};

type KindStyles = {
  shell: string;
  icon: string;
  accent: string;
};

const KIND_STYLES: Record<PublicNoticeKind, KindStyles> = {
  info: {
    shell: "border-bus/30 bg-bus/[0.07] dark:border-bus/35 dark:bg-bus/[0.1]",
    icon: "bg-bus text-bus-foreground",
    accent: "text-bus-deep",
  },
  organizational: {
    shell:
      "border-amber-500/30 bg-amber-500/[0.08] dark:border-amber-400/30 dark:bg-amber-500/[0.12]",
    icon: "bg-amber-600 text-white dark:bg-amber-500",
    accent: "text-amber-800 dark:text-amber-200",
  },
  urgent: {
    shell:
      "border-destructive/35 bg-destructive/8 dark:border-destructive/40 dark:bg-destructive/15",
    icon: "bg-destructive text-white",
    accent: "text-destructive",
  },
};

type ScheduleNoticeBannerProps = {
  notice: PublicNotice;
  className?: string;
};

/** Non-blocking notice shown above the trip list. */
export function ScheduleNoticeBanner({
  notice,
  className,
}: ScheduleNoticeBannerProps) {
  const styles = KIND_STYLES[notice.kind];
  const KindIcon = KIND_ICONS[notice.kind];

  return (
    <aside
      role="status"
      className={cn(
        "rounded-xl border border-l-2 px-3.5 py-3 text-sm shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]",
        styles.shell,
        notice.kind === "info"
          ? "border-l-bus/60"
          : notice.kind === "organizational"
            ? "border-l-amber-500/70"
            : "border-l-destructive/60",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            styles.icon,
          )}
        >
          <KindIcon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-foreground">{notice.title}</p>
          <p className="leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {notice.message}
          </p>
          <p className={cn("text-xs font-medium", styles.accent)}>
            {PUBLIC_NOTICE_KIND_LABELS[notice.kind]}
            {" · "}
            {formatPublicNoticeSpan(notice.dateFrom, notice.dateTo)}
          </p>
        </div>
      </div>
    </aside>
  );
}

type ScheduleClosureCardProps = {
  notice: PublicNotice;
  className?: string;
};

/** Blocking notice that replaces the trip list for the selected day. */
export function ScheduleClosureCard({
  notice,
  className,
}: ScheduleClosureCardProps) {
  const styles = KIND_STYLES[notice.kind];
  const KindIcon = KIND_ICONS[notice.kind];

  return (
    <section
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-2xl border px-4 py-5 sm:px-5 sm:py-6",
        styles.shell,
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            styles.icon,
          )}
        >
          <KindIcon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="font-display text-xl font-bold tracking-tight text-asphalt dark:text-foreground">
            {notice.title}
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
            {notice.message}
          </p>
          <p className={cn("text-xs font-medium", styles.accent)}>
            {PUBLIC_NOTICE_KIND_LABELS[notice.kind]}
            {" · "}
            {formatPublicNoticeSpan(notice.dateFrom, notice.dateTo)}
            {" · "}
            Odwołuje kursy
          </p>
        </div>
      </div>
    </section>
  );
}
