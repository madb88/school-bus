import Link from "next/link";
import { cn } from "cn";

type SiteNavProps = {
  current: "rozklad" | "lekcje";
};

export function SiteNav({ current }: SiteNavProps) {
  const linkClass = (active: boolean) =>
    cn(
      "text-sm font-medium transition-colors",
      active
        ? "text-asphalt"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <nav className="flex items-center gap-5">
      <Link href="/" className={linkClass(current === "rozklad")}>
        Rozkład
      </Link>
      <Link href="/lekcje" className={linkClass(current === "lekcje")}>
        Plan lekcji
      </Link>
    </nav>
  );
}
