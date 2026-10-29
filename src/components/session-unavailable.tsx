"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Shown when the session cookie is present but /users/me cannot be reached.
 * Must not look like a logged-out state.
 */
export function SessionUnavailablePanel() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg space-y-4 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
        Konto chwilowo niedostępne
      </h1>
      <p className="text-muted-foreground">
        Nie udało się sprawdzić sesji. Twoje logowanie nie zostało anulowane —
        spróbuj odświeżyć stronę za chwilę.
      </p>
      <Button type="button" onClick={() => router.refresh()}>
        Odśwież
      </Button>
    </div>
  );
}
