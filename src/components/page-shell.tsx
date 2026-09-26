import type { ReactNode } from "react";
import { FeedbackFab } from "@/components/feedback-fab";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "cn";

export function PageShell({
  children,
  wide = false,
  header,
}: {
  children: ReactNode;
  /** Wider content column — used by the schedule filters layout. */
  wide?: boolean;
  /** Shared header column (max-w-6xl) — same width on every page. */
  header?: ReactNode;
}) {
  return (
    <>
      <main className="relative flex-1 overflow-x-clip">
        <div
          aria-hidden
          className="page-atmosphere pointer-events-none absolute inset-0 print:hidden"
        />
        {header ? (
          <div className="relative mx-auto mb-8 w-full max-w-6xl px-6 pt-10 sm:px-10 sm:pt-14 print:hidden">
            {header}
          </div>
        ) : null}
        <div
          className={cn(
            "relative mx-auto w-full px-6 sm:px-10 print:max-w-none print:px-0 print:py-0",
            header ? "pb-10 sm:pb-14" : "py-10 sm:py-14",
            wide ? "max-w-6xl" : "max-w-4xl",
          )}
        >
          {children}
        </div>
      </main>
      <SiteFooter />
      <FeedbackFab />
    </>
  );
}
