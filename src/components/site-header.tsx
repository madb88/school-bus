import Image from "next/image";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { SiteNav, type NavId } from "@/components/site-nav";
import { ThemeToggle } from "@/components/theme-toggle";

type SiteHeaderProps = {
  current: NavId;
};

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="animate-rise flex items-center justify-between gap-4">
      <Link
        href="/"
        className="group inline-flex min-w-0 items-center gap-2.5 no-underline"
      >
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={64}
          height={64}
          priority
          className="size-8 shrink-0 rounded-lg transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105"
        />
        <span className="truncate font-display text-sm font-semibold tracking-tight text-asphalt sm:text-base">
          Dojazdy do szkoły
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <SiteNav current={current} />
        <MobileNav current={current} />
        <ThemeToggle />
      </div>
    </header>
  );
}
