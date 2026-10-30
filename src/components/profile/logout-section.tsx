"use client";

import { Button } from "@/components/ui/button";

export function LogoutSection({
  error,
  pending,
  onLogout,
}: {
  error: string | null;
  pending: boolean;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="font-display text-xl font-semibold tracking-tight text-asphalt sm:text-2xl">
          Wyloguj
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Ta sesja jest tylko na tym urządzeniu. Wylogowanie nie wylogowuje
          pozostałych.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={onLogout}
        className="h-11 w-full sm:w-auto"
      >
        {pending ? "Wylogowuję…" : "Wyloguj"}
      </Button>
    </div>
  );
}
