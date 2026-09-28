import Image from "next/image";
import Link from "next/link";
import { MobileNav } from "@/components/mobile-nav";
import { SiteNav, type NavId } from "@/components/site-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { siteTagline } from "@/lib/site-metadata";

type SiteHeaderProps = {
  /** When omitted, no primary nav item is highlighted (e.g. /o-projekcie). */
  current?: NavId;
};

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        href="/"
        className="inline-flex min-w-0 items-center gap-2 no-underline sm:gap-2.5 sm:shrink-0"
      >
        <Image
          src="/icons/logo-bus-sm.png"
          alt=""
          width={144}
          height={96}
          priority
          className="h-8 w-auto shrink-0 sm:h-9"
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-display text-sm font-bold leading-tight tracking-tight sm:text-[0.95rem]">
            <span className="text-asphalt">autobus</span>
            <span className="text-bus">szkolny.pl</span>
          </span>
          <span className="truncate text-[0.6rem] font-medium leading-snug text-muted-foreground sm:text-[0.65rem]">
            {siteTagline}
          </span>
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
