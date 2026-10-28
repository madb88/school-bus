"use client";

import { cn } from "cn";
import { formatUnreadNewsCount } from "@/lib/news-seen";
import { useUnreadNewsCount } from "@/lib/use-unread-news-count";

type NewsUnreadBadgeProps = {
  /** `count` = red pill with number; `dot` = plain red signal (hamburger). */
  variant?: "count" | "dot";
  /** Corner of a `relative` parent, or inline in a flex row (mobile sheet). */
  position?: "absolute" | "inline";
  className?: string;
};

export function NewsUnreadBadge({
  variant = "count",
  position = "absolute",
  className,
}: NewsUnreadBadgeProps) {
  const unread = useUnreadNewsCount();
  if (unread <= 0) return null;

  if (variant === "dot") {
    return (
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 right-0.5 size-2 rounded-full bg-destructive ring-2 ring-card",
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-semibold text-white tabular-nums",
        position === "absolute" &&
          "absolute -top-1 -right-1 ring-2 ring-card",
        className,
      )}
    >
      {formatUnreadNewsCount(unread)}
    </span>
  );
}

/** For aria-label on Nowości links — SSR-safe (0 until hydrate). */
export function useUnreadNewsAriaLabel(baseLabel: string): string {
  const unread = useUnreadNewsCount();
  if (unread <= 0) return baseLabel;
  return `${baseLabel} (${formatUnreadNewsCount(unread)} nowe)`;
}
