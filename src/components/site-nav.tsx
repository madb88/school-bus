import Link from "next/link";
import { cn } from "cn";

type SiteNavProps = {
  current: "rozklad" | "lekcje" | "mzk";
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
    <nav className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/50 p-1 backdrop-blur-sm">
      <Link href="/" className={linkClass(current === "rozklad")}>
        Rozkład
      </Link>
      <Link href="/lekcje" className={linkClass(current === "lekcje")}>
        Plan lekcji
      </Link>
      <Link href="/mzk" className={linkClass(current === "mzk")}>
        MZK
      </Link>
    </nav>
  );
}
