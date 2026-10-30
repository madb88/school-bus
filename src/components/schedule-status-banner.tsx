"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "cn";
import { AlertTriangle, ChevronDown, Info, WifiOff } from "lucide-react";
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

function BannerCta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
    >
      {label}
    </Link>
  );
}

function BannerRow({ item }: { item: FreshnessInfo }) {
  const Icon = rowIcon(item.level);
  const isAlert = item.level === "expired" || item.level === "offline";
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
  const hasBody = Boolean(item.detail || item.detailCompact || item.cta);
  const [open, setOpen] = useState(false);

  const shellClass = cn(
    "border-l-2 text-sm leading-snug md:leading-relaxed",
    isAlert
      ? "border-destructive/50 bg-destructive/5 text-destructive"
      : "border-bus/40 bg-muted/40 text-muted-foreground",
  );

  const iconClass = cn(
    "size-3.5 shrink-0 md:size-4",
    isAlert ? "text-destructive" : "text-bus",
  );

  if (!hasBody) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 px-3 py-2 md:gap-2.5 md:px-4 md:py-3",
          shellClass,
        )}
      >
        <Icon aria-hidden className={cn(iconClass, "mt-0.5 md:mt-0")} />
        <div className="min-w-0">
          <p title={item.detail} className={cn("md:hidden", titleClass)}>
            {compactTitle}
          </p>
          <p
            title={item.detail}
            className={cn("hidden md:block", titleClass)}
          >
            {item.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left md:gap-2.5 md:px-4 md:py-2.5"
        onClick={() => setOpen((current) => !current)}
      >
        <Icon aria-hidden className={iconClass} />
        <span className="min-w-0 flex-1">
          <span className={cn("block md:hidden", titleClass)}>
            {compactTitle}
          </span>
          <span className={cn("hidden md:block", titleClass)}>
            {item.message}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
            isAlert && "text-destructive/70",
          )}
        />
      </button>
      {open ? (
        <div className="space-y-1.5 px-3 pb-2.5 pl-[2.125rem] md:px-4 md:pb-3 md:pl-[2.625rem]">
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
          {item.cta ? (
            <BannerCta href={item.cta.href} label={item.cta.label} />
          ) : null}
        </div>
      ) : null}
    </div>
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
      {rows.map((item) => (
        <BannerRow key={item.message} item={item} />
      ))}
    </div>
  );
}
