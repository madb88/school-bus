"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useUnreadNewsAriaLabel } from "@/components/news-unread-badge";

type NowosciNavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

export function NowosciNavLink({
  children,
  ...props
}: NowosciNavLinkProps) {
  const ariaLabel = useUnreadNewsAriaLabel("Nowości");

  return (
    <Link {...props} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
