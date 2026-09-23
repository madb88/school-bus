import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { ThemeToggle } from "@/components/theme-toggle";

type SiteHeaderProps = {
  current: "rozklad" | "lekcje" | "mzk";
};

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="animate-rise flex flex-wrap items-center justify-between gap-4">
      <Link
        href="/"
        className="group inline-flex items-center gap-2.5 no-underline"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-lg bg-bus text-bus-foreground shadow-[0_0_0_1px_color-mix(in_srgb,var(--bus)_40%,transparent)] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="6" width="18" height="11" rx="2" />
            <path d="M7 17v2M17 17v2M3 12h18M7 9h2M15 9h2" />
          </svg>
        </span>
        <span className="font-display text-sm font-semibold tracking-tight text-asphalt sm:text-base">
          Dojazdy do szkoły
        </span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-4">
        <SiteNav current={current} />
        <ThemeToggle />
      </div>
    </header>
  );
}
