"use client";

import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Fullscreen gate for users without Plan Plus offline entitlement.
 * Covers app chrome so cached SSR schedule cannot leak through.
 */
export function OfflineNoAccessScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background px-6 py-[max(1.5rem,env(safe-area-inset-top))] text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-sm flex-col items-center">
        <span
          aria-hidden
          className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive"
        >
          <WifiOff className="size-7" strokeWidth={2.25} />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
          Brak połączenia z internetem
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Bez internetu nie ma dostępu do aplikacji.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Rozkład offline działa tylko dla użytkowników{" "}
          <span className="font-semibold text-foreground">Planu Plus</span> —
          po wcześniejszym otwarciu aplikacji online.
        </p>
        <Button
          type="button"
          className="mt-8"
          onClick={() => {
            window.location.reload();
          }}
        >
          Odśwież
        </Button>
      </div>
    </div>
  );
}
