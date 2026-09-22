import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="relative flex-1 overflow-x-clip">
        <div
          aria-hidden
          className="page-atmosphere pointer-events-none absolute inset-0"
        />
        <div className="relative mx-auto max-w-4xl px-6 py-10 sm:px-10 sm:py-14">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
