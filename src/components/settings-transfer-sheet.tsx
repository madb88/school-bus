"use client";

import { QrCode, Smartphone } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { loadLessonMatchWindow } from "@/lib/child-schedule/match-window";
import {
  hasConfiguredLessons,
  loadLessonPlan,
} from "@/lib/child-schedule/storage";
import {
  hasConfiguredMzkRoute,
  loadMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import { formatTransferCode } from "@/lib/settings-transfer/token";

type CreateResponse = {
  token: string;
  code: string;
  url: string;
  expiresInSec: number;
  error?: string;
};

type SettingsTransferSheetProps = {
  /** When false, trigger stays disabled with a hint. */
  canTransfer: boolean;
  /** Visible label on the trigger. Behavior stays the same. */
  triggerLabel?: string;
};

export function SettingsTransferSheet({
  canTransfer,
  triggerLabel = "Przenieś na inne urządzenie",
}: SettingsTransferSheetProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresInSec, setExpiresInSec] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetPanel() {
    setError(null);
    setQrDataUrl(null);
    setCode(null);
    setExpiresInSec(null);
  }

  function createTransfer() {
    startTransition(async () => {
      try {
        const lessonPlan = loadLessonPlan();
        const mzkRoute = loadMzkRoutePreference();
        const matchWindowMin = loadLessonMatchWindow();

        if (
          !hasConfiguredLessons(lessonPlan) &&
          !hasConfiguredMzkRoute(mzkRoute)
        ) {
          setError("Najpierw zapisz plan lekcji albo trasę MZK.");
          return;
        }

        const res = await fetch("/api/settings-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonPlan,
            mzkRoute,
            matchWindowMin,
          }),
        });

        const data = (await res.json()) as CreateResponse;
        if (!res.ok) {
          setError(data.error ?? "Nie udało się utworzyć kodu.");
          return;
        }

        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(data.url, {
          margin: 1,
          width: 240,
          errorCorrectionLevel: "M",
          color: { dark: "#1a1a1a", light: "#ffffff" },
        });

        setError(null);
        setQrDataUrl(dataUrl);
        setCode(data.code || formatTransferCode(data.token));
        setExpiresInSec(data.expiresInSec);
      } catch {
        setError("Nie udało się utworzyć kodu transferu.");
      }
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    resetPanel();
    if (canTransfer) createTransfer();
  }

  function regenerate() {
    resetPanel();
    createTransfer();
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Skopiowano kod");
    } catch {
      toast.error("Nie udało się skopiować");
    }
  }

  const minutes =
    expiresInSec != null ? Math.max(1, Math.round(expiresInSec / 60)) : null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={!canTransfer}
            title={
              canTransfer
                ? undefined
                : "Najpierw zapisz plan lekcji albo trasę MZK"
            }
          />
        }
      >
        <Smartphone aria-hidden />
        {triggerLabel}
      </SheetTrigger>
      <SheetContent side="right" className="gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <QrCode aria-hidden className="size-4" />
            Przenieś ustawienia
          </SheetTitle>
          <SheetDescription>
            Zeskanuj kod aparatem drugiego urządzenia albo wpisz kod na stronie
            odbioru. Kod wygasa po kilku minutach; zużywa się dopiero po
            potwierdzeniu przywrócenia.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          {error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending || !canTransfer}
                onClick={regenerate}
              >
                Spróbuj ponownie
              </Button>
            </div>
          ) : null}

          {pending && !qrDataUrl && !error ? (
            <p className="text-sm text-muted-foreground">Generuję kod…</p>
          ) : null}

          {qrDataUrl ? (
            <div className="mx-auto rounded-xl border border-border/70 bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Kod QR do przeniesienia ustawień"
                width={240}
                height={240}
                className="size-60"
              />
            </div>
          ) : null}

          {code ? (
            <div className="space-y-2 text-center">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Kod
              </p>
              <p className="font-display text-2xl font-semibold tracking-widest text-asphalt tabular-nums">
                {code}
              </p>
              {minutes != null ? (
                <p className="text-sm text-muted-foreground">
                  Ważny ok. {minutes} min
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={copyCode}
                >
                  Kopiuj kod
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={regenerate}
                >
                  Nowy kod
                </Button>
              </div>
            </div>
          ) : null}

          <p className="text-xs leading-relaxed text-muted-foreground">
            Na drugim urządzeniu otwórz zeskanowany link albo wejdź w{" "}
            <span className="font-medium text-foreground">/przywroc</span> i
            wpisz kod. Anulowanie podglądu nie zużywa kodu.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
