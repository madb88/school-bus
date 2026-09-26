import Link from "next/link";
import {
  Bus,
  CalendarDays,
  Info,
  Map,
  Newspaper,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

export type NavId =
  | "rozklad"
  | "lekcje"
  | "mzk"
  | "nowosci"
  | "instalacja"
  | "o-aplikacji";

export const NAV_ITEMS: ReadonlyArray<{
  id: NavId;
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "rozklad", href: "/", label: "Rozkład", icon: Bus },
  { id: "lekcje", href: "/lekcje", label: "Plan lekcji", icon: CalendarDays },
  { id: "mzk", href: "/mzk", label: "MZK", icon: Map },
  { id: "nowosci", href: "/nowosci", label: "Nowości", icon: Newspaper },
  { id: "instalacja", href: "/instalacja", label: "Aplikacja", icon: Smartphone },
  { id: "o-aplikacji", href: "/o-aplikacji", label: "O projekcie", icon: Info },
];

type SiteNavProps = {
  current: NavId;
};

export function SiteNav({ current }: SiteNavProps) {
  const linkClass = (active: boolean) =>
    cn(
      "relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
      active
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
        return (
          <Link
            key={item.id}
            href={item.href}
            className={linkClass(current === item.id)}
            aria-current={current === item.id ? "page" : undefined}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
