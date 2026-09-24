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
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<SettingsTransferPayload | null>(null);
  const [summary, setSummary] = useState<SettingsTransferSummary | null>(null);
  const [hasLocal] = useState(readHasLocalSettings);
  const autoRedeemed = useRef(false);

  function redeem(raw: string) {
    const token = normalizeTransferToken(raw);
    if (!token) {
      setError("Wpisz kod z drugiego urządzenia.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/settings-transfer?t=${encodeURIComponent(token)}`,
        );
        const data = (await res.json()) as RedeemResponse;
        if (!res.ok || !data.payload) {
          setError(data.error ?? "Nie udało się odczytać kodu.");
          setPayload(null);
          setSummary(null);
          return;
        }
        setError(null);
        setPayload(data.payload);
        setSummary(data.summary ?? null);
        setCodeInput(formatTransferCode(token));
      } catch {
        setError("Nie udało się połączyć z serwerem.");
        setPayload(null);
        setSummary(null);
      }
    });
  }

  useEffect(() => {
    if (!normalizedInitial || autoRedeemed.current) return;
    autoRedeemed.current = true;

    const token = normalizedInitial;
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/settings-transfer?t=${encodeURIComponent(token)}`,
        );
        const data = (await res.json()) as RedeemResponse;
        if (!res.ok || !data.payload) {
          setError(data.error ?? "Nie udało się odczytać kodu.");
          return;
        }
        setPayload(data.payload);
        setSummary(data.summary ?? null);
        setCodeInput(formatTransferCode(token));
      } catch {
        setError("Nie udało się połączyć z serwerem.");
      }
    });
  }, [normalizedInitial]);

  function apply() {
    if (!payload) return;
    applySettingsTransferPayload(payload);
    toast.success("Ustawienia przywrócone na tym urządzeniu");
    router.push("/lekcje");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {!payload ? (
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
              disabled={pending}
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
            disabled={pending || !normalizeTransferToken(codeInput)}
            onClick={() => redeem(codeInput)}
          >
            {pending ? "Odczytuję…" : "Odbierz ustawienia"}
          </Button>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Kod jest jednorazowy — po odczytaniu znika z serwera. Jeśli coś
            pójdzie nie tak, wygeneruj nowy na urządzeniu źródłowym.
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
                {summary?.place ?? payload.lessonPlan.place ?? "—"}
              </span>
            </li>
            <li>
              Dni w planie lekcji:{" "}
              <span className="font-medium text-foreground">
                {summary?.lessonDays ??
                  Object.keys(payload.lessonPlan.days).length}
              </span>
            </li>
            <li>
              Trasa MZK:{" "}
              <span className="font-medium text-foreground">
                {summary?.hasMzkRoute ||
                hasConfiguredMzkRoute(payload.mzkRoute)
                  ? "tak"
                  : "nie"}
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
            <Button type="button" size="lg" onClick={apply}>
              Przywróć na tym urządzeniu
            </Button>
            <Link
              href="/lekcje"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Anuluj
            </Link>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Kod został już zużyty. Anulowanie nie przywróci go — wygeneruj nowy
            QR na drugim urządzeniu, jeśli potrzebujesz.
          </p>
        </div>
      )}
    </div>
  );
}
