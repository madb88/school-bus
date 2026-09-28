import type { ReactNode } from "react";

/** Small blue section label above page titles (not used on the schedule). */
export function PageEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-bus uppercase">
      {children}
    </p>
  );
}
