"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hasConfiguredLessons,
  loadLessonPlan,
} from "@/lib/child-schedule/storage";
import {
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import { applySettingsTransferPayload } from "@/lib/settings-transfer/apply";
import {
  formatTransferCode,
  normalizeTransferToken,
} from "@/lib/settings-transfer/token";
import type {
  SettingsTransferPayload,
  SettingsTransferSummary,
} from "@/lib/settings-transfer/types";

type PeekResponse = {
  summary?: SettingsTransferSummary;
  expiresInSec?: number;
  error?: string;
};

type RedeemResponse = {
  payload?: SettingsTransferPayload;
  summary?: SettingsTransferSummary;
  error?: string;
};

type SettingsRestorePanelProps = {
  initialToken?: string;
};

function readHasLocalSettings(): boolean {
  if (typeof window === "undefined") return false;
  return (
    hasConfiguredLessons(loadLessonPlan()) ||
    hasConfiguredMzkRoute(loadMzkRoutePreference())
  );
}

export function SettingsRestorePanel({
  initialToken = "",
}: SettingsRestorePanelProps) {
  const router = useRouter();
  const normalizedInitial = normalizeTransferToken(initialToken);
  const [codeInput, setCodeInput] = useState(
    normalizedInitial ? formatTransferCode(normalizedInitial) : "",
  );
  const [token, setToken] = useState(normalizedInitial);
  const [pending, startTransition] = useTransition();
  const [applying, startApply] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SettingsTransferSummary | null>(null);
  const [hasLocal] = useState(readHasLocalSettings);
  const autoPeeked = useRef(false);

  function peek(raw: string) {
    const nextToken = normalizeTransferToken(raw);
    if (!nextToken) {
      setError("Wpisz kod z drugiego urządzenia.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/settings-transfer?t=${encodeURIComponent(nextToken)}`,
        );
        const data = (await res.json()) as PeekResponse;
        if (!res.ok || !data.summary) {
          setError(data.error ?? "Nie udało się odczytać kodu.");
          setSummary(null);
          setToken("");
          return;
        }
        setError(null);
        setSummary(data.summary);
        setToken(nextToken);
        setCodeInput(formatTransferCode(nextToken));
        // Drop token from the address bar so cancel/history is cleaner.
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          if (url.searchParams.has("t") || url.searchParams.has("code")) {
            url.searchParams.delete("t");
            url.searchParams.delete("code");
            window.history.replaceState({}, "", url.pathname);
          }
        }
      } catch {
        setError("Nie udało się połączyć z serwerem.");
        setSummary(null);
        setToken("");
      }
    });
  }

  useEffect(() => {
    if (!normalizedInitial || autoPeeked.current) return;
    autoPeeked.current = true;
    peek(normalizedInitial);
  }, [normalizedInitial]);

  function apply() {
    if (!token) return;

    startApply(async () => {
      try {
        const res = await fetch(
          `/api/settings-transfer?t=${encodeURIComponent(token)}`,
          { method: "DELETE" },
        );
        const data = (await res.json()) as RedeemResponse;
        if (!res.ok || !data.payload) {
          setError(data.error ?? "Nie udało się przywrócić ustawień.");
          setSummary(null);
          return;
        }
        applySettingsTransferPayload(data.payload);
        toast.success("Ustawienia przywrócone na tym urządzeniu");
        router.push("/lekcje");
      } catch {
        setError("Nie udało się połączyć z serwerem.");
      }
    });
  }

  function cancelPreview() {
    setSummary(null);
    setError(null);
    // Keep code in the input — cancel does not consume the Redis entry.
  }

  const busy = pending || applying;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {!summary ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transfer-code">Kod z QR / drugiego urządzenia</Label>
            <Input
              id="transfer-code"
              value={codeInput}
              onChange={(event) => {
                setCodeInput(event.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="AB7K-9M2Q"
              autoComplete="off"
              spellCheck={false}
              className="h-11 font-mono tracking-widest uppercase"
              disabled={busy}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            size="lg"
            disabled={busy || !normalizeTransferToken(codeInput)}
            onClick={() => peek(codeInput)}
          >
            {pending ? "Odczytuję…" : "Pokaż ustawienia"}
          </Button>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Podgląd nie zużywa kodu. Kod znika dopiero po potwierdzeniu
            przywrócenia na tym urządzeniu.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-xl border border-border/70 bg-card/90 p-5 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
          <h2 className="font-display text-lg font-semibold text-asphalt">
            Znaleziono ustawienia
          </h2>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>
              Miejsce:{" "}
              <span className="font-medium text-foreground">
                {summary.place ?? "—"}
              </span>
            </li>
            <li>
              Dni w planie lekcji:{" "}
              <span className="font-medium text-foreground">
                {summary.lessonDays}
              </span>
            </li>
            <li>
              Trasa MZK:{" "}
              <span className="font-medium text-foreground">
                {summary.hasMzkRoute ? "tak" : "nie"}
              </span>
            </li>
          </ul>

          {hasLocal ? (
            <p className="text-sm text-asphalt/90">
              Na tym urządzeniu są już zapisane ustawienia — przywrócenie je
              zastąpi.
            </p>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              disabled={busy}
              onClick={apply}
            >
              {applying ? "Przywracam…" : "Przywróć na tym urządzeniu"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={cancelPreview}
            >
              Wróć
            </Button>
            <Link
              href="/lekcje"
              className={buttonVariants({ size: "lg", variant: "ghost" })}
            >
              Anuluj
            </Link>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Anulowanie albo „Wróć” nie zużywa kodu — możesz otworzyć go ponownie,
            dopóki nie wygaśnie.
          </p>
        </div>
      )}
    </div>
  );
}
