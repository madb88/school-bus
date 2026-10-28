"use client";

import Link from "next/link";
import {
  BookOpen,
  Bus,
  CalendarDays,
  Info,
  Map,
  Newspaper,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { NewsUnreadBadge } from "@/components/news-unread-badge";
import { NowosciNavLink } from "@/components/nowosci-nav-link";
import { useOnlineStatus } from "@/lib/offline/use-online-status";

export type NavId =
  | "rozklad"
  | "lekcje"
  | "mzk"
  | "nowosci"
  | "instalacja"
  | "o-aplikacji"
  | "o-projekcie";

export const NAV_ITEMS: ReadonlyArray<{
  id: NavId;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Safe to open from a cold offline PWA shell. */
  offlineAvailable: boolean;
}> = [
  {
    id: "rozklad",
    href: "/",
    label: "Rozkład",
    icon: Bus,
    offlineAvailable: true,
  },
  {
    id: "lekcje",
    href: "/lekcje",
    label: "Plan lekcji",
    icon: CalendarDays,
    offlineAvailable: true,
  },
  { id: "mzk", href: "/mzk", label: "MZK", icon: Map, offlineAvailable: false },
  {
    id: "nowosci",
    href: "/nowosci",
    label: "Nowości",
    icon: Newspaper,
    offlineAvailable: false,
  },
  {
    id: "instalacja",
    href: "/instalacja",
    label: "Aplikacja",
    icon: Smartphone,
    offlineAvailable: false,
  },
  {
    id: "o-aplikacji",
    href: "/o-aplikacji",
    label: "Jak zacząć",
    icon: Info,
    offlineAvailable: false,
  },
  {
    id: "o-projekcie",
    href: "/o-projekcie",
    label: "O projekcie",
    icon: BookOpen,
    offlineAvailable: false,
  },
];

export const OFFLINE_NAV_HINT = "Wymaga połączenia z internetem" as const;

type SiteNavProps = {
  current?: NavId;
};

export function SiteNav({ current }: SiteNavProps) {
  const online = useOnlineStatus();

  const linkClass = (active: boolean, disabled: boolean) =>
    cn(
      "relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
      disabled
        ? "cursor-not-allowed text-muted-foreground/45"
        : active
          ? "bg-bus text-bus-foreground shadow-none"
          : "text-muted-foreground hover:bg-bus/10 hover:text-bus-deep",
    );

  return (
    <nav
      className="hidden items-center gap-1 rounded-lg border border-border/60 bg-card/50 p-1 backdrop-blur-sm md:flex"
      aria-label="Główne"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = current === item.id;
        const disabled = !online && !item.offlineAvailable;
        const className = linkClass(active, disabled);

        if (disabled) {
          return (
            <span
              key={item.id}
              role="link"
              aria-disabled="true"
              title={OFFLINE_NAV_HINT}
              className={className}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {item.label}
            </span>
          );
        }

        if (item.id === "nowosci") {
          return (
            <NowosciNavLink
              key={item.id}
              href={item.href}
              className={className}
              aria-current={active ? "page" : undefined}
            >
              <Icon aria-hidden className="size-4 shrink-0" />
              {item.label}
              <NewsUnreadBadge />
            </NowosciNavLink>
          );
        }

        return (
          <Link
            key={item.id}
            href={item.href}
            className={className}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
