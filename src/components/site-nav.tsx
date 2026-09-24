import Link from "next/link";
import { cn } from "cn";

export type NavId = "rozklad" | "lekcje" | "mzk" | "nowosci" | "o-aplikacji";

export const NAV_ITEMS: ReadonlyArray<{
  id: NavId;
  href: string;
  label: string;
}> = [
  { id: "rozklad", href: "/", label: "Rozkład" },
  { id: "lekcje", href: "/lekcje", label: "Plan lekcji" },
  { id: "mzk", href: "/mzk", label: "MZK" },
  { id: "nowosci", href: "/nowosci", label: "Nowości" },
  { id: "o-aplikacji", href: "/o-aplikacji", label: "O aplikacji" },
];

type SiteNavProps = {
  current: NavId;
};

export function SiteNav({ current }: SiteNavProps) {
  const linkClass = (active: boolean) =>
    cn(
      "relative rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-muted text-asphalt"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    );

  return (
    <nav
      className="hidden items-center gap-1 rounded-lg border border-border/60 bg-card/50 p-1 backdrop-blur-sm md:flex"
      aria-label="Główne"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={linkClass(current === item.id)}
          aria-current={current === item.id ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
