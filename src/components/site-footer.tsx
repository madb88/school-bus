import Link from "next/link";
import { formatAppVersion } from "@/lib/app-version";
import { siteName } from "@/lib/site-metadata";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const version = formatAppVersion();

  return (
    <footer className="border-t border-border/60 print:hidden">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 sm:px-10">
        <p className="text-sm text-muted-foreground">
          © {year} {siteName}
          <span aria-hidden className="mx-1.5 text-border">
            ·
          </span>
          <span className="tabular-nums">{version}</span>
          <span aria-hidden className="mx-1.5 text-border">
            ·
          </span>
          <Link
            href="/o-projekcie"
            className="underline underline-offset-2 hover:text-foreground"
          >
            O projekcie
          </Link>
          <span aria-hidden className="mx-1.5 text-border">
            ·
          </span>
          <Link
            href="/regulamin"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Regulamin
          </Link>
          <span aria-hidden className="mx-1.5 text-border">
            ·
          </span>
          <Link
            href="/polityka-prywatnosci"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Polityka prywatności
          </Link>
        </p>
      </div>
    </footer>
  );
}
