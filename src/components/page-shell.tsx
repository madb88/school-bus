import type { ReactNode } from "react";
import { FeedbackFab } from "@/components/feedback-fab";
import { PwaPrompt } from "@/components/pwa-prompt";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "cn";

export function PageShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  /** Wider content column — used by the schedule filters layout. */
  wide?: boolean;
}) {
  return (
    <>
      <main className="relative flex-1 overflow-x-clip">
        <div
          aria-hidden
          className="page-atmosphere pointer-events-none absolute inset-0 print:hidden"
        />
        <div
          className={cn(
            "relative mx-auto px-6 py-10 sm:px-10 sm:py-14 print:max-w-none print:px-0 print:py-0",
            wide ? "max-w-6xl" : "max-w-4xl",
          )}
        >
          <PwaPrompt />
          {children}
        </div>
      </main>
      <SiteFooter />
      <FeedbackFab />
    </>
  );
}
