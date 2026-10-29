"use client";

import { useEffect } from "react";
import { goToStaticOfflineGate } from "@/lib/offline/static-offline-gate";

/**
 * Free / non-Plus offline users must not see the Next app shell.
 * Redirects to the prebuilt centered page at `/offline.html`.
 */
export function OfflineNoAccessScreen() {
  useEffect(() => {
    goToStaticOfflineGate();
  }, []);

  return (
    <p className="px-6 py-16 text-center text-sm text-muted-foreground">
      Przekierowanie…
    </p>
  );
}
