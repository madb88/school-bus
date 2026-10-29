import type { Metadata } from "next";
import { OfflineScheduleApp } from "@/components/offline-schedule-app";
import { buildPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Rozkład offline",
    description:
      "Spersonalizowany rozkład jazdy dostępny bez internetu (Plan Plus).",
    path: "/offline",
  }),
  robots: { index: false, follow: false },
};

/** Minimal document — no PageShell / nav; sole Plan Plus offline surface. */
export default function OfflinePage() {
  return <OfflineScheduleApp />;
}
