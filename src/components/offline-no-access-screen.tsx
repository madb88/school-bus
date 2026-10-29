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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className="mb-5 inline-flex size-14 items-center justify-center rounded-full bg-destructive/15 text-destructive"
      >
        <WifiOff className="size-7" strokeWidth={2.25} />
      </span>
      <h1 className="max-w-md font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
        Brak połączenia z internetem
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Bez internetu nie ma dostępu do aplikacji. Tryb offline z lokalną kopią
        rozkładu jest dostępny w Planie Plus — po wcześniejszym otwarciu
        aplikacji online.
      </p>
      <Button
        type="button"
        className="mt-6"
        onClick={() => {
          window.location.reload();
        }}
      >
        Odśwież
      </Button>
    </div>
  );
}
