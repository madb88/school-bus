"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOWOZY_SOURCE_URL } from "@/lib/dowozy/types";

/** Full-page empty state when the school schedule cannot be loaded. */
export function ScheduleUnavailable() {
  return (
    <div
      className="flex min-h-[min(28rem,70dvh)] flex-col items-center justify-center px-2 py-10 text-center sm:px-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-lg flex-col items-center gap-5 sm:gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- keep WebP alpha; next/image can paint a black matte */}
        <img
          src="/images/schedule-unavailable.webp"
          alt=""
          width={800}
          height={400}
          decoding="async"
          className="h-auto w-full max-w-[20rem] select-none sm:max-w-[24rem]"
        />

        <div className="max-w-md space-y-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl md:text-[2rem] md:leading-tight">
            Serwis chwilowo nie działa
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem] sm:leading-relaxed">
            Rozkład szkolny jest obecnie niedostępny. Pracujemy nad
            przywróceniem działania serwisu tak szybko, jak to możliwe.
          </p>
        </div>

        <Button
          type="button"
          size="lg"
          className="h-11 gap-2 rounded-xl px-6 text-sm font-medium sm:h-12 sm:px-7 sm:text-[0.95rem]"
          onClick={() => {
            window.location.reload();
          }}
        >
          <RefreshCw className="size-4" aria-hidden />
          Spróbuj ponownie później
        </Button>

        <p className="max-w-md text-sm text-muted-foreground">
          Możesz też sprawdzić aktualne informacje na{" "}
          <a
            href={DOWOZY_SOURCE_URL}
            className="font-medium text-bus underline underline-offset-2 hover:text-bus-deep"
            target="_blank"
            rel="noreferrer"
          >
            stronie szkoły
          </a>
          .
        </p>
      </div>
    </div>
  );
}
