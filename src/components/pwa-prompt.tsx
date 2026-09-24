"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import {
  disablePush,
  dismissPwaBanner,
  enablePush,
  getPwaUiServerSnapshot,
  getPwaUiSnapshot,
  planReadyForPush,
  subscribePwaUi,
} from "@/lib/push/browser";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaPrompt() {
  const plan = useLessonPlan();
  const ui = useSyncExternalStore(
    subscribePwaUi,
    getPwaUiSnapshot,
    getPwaUiServerSnapshot,
  );
  const [ios, standalone, dismissed, permission, subscribed] = ui.split("|");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onInstallPrompt);
  }, []);

  if (dismissed === "1") return null;
  if (standalone === "1" && subscribed === "1") return null;

  const notificationsInBrowser = ios !== "1" || standalone === "1";
  const planReady = planReadyForPush(plan);

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstallEvent(null);
  }

  async function enable() {
    setPending(true);
    try {
      const result = await enablePush(plan);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Powiadomienia włączone", {
        description: "Przypomnienie przyjdzie około 15 minut przed Twoim kursem.",
      });
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    try {
      await disablePush();
      toast.success("Powiadomienia wyłączone");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mb-6 border-l-2 border-bus/40 bg-muted/40 px-4 py-3 text-sm leading-relaxed print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="font-medium text-foreground">Aplikacja na telefonie</p>
          {installEvent ? (
            <Button type="button" size="sm" variant="secondary" onClick={() => void install()}>
              Zainstaluj
            </Button>
          ) : null}
          {ios === "1" && standalone !== "1" ? (
            <p className="text-foreground/80">
              W Safari stuknij Udostępnij, a potem „Dodaj do ekranu początkowego”.
              Powiadomienia włączysz dopiero w zainstalowanej aplikacji.
            </p>
          ) : null}
          {notificationsInBrowser && subscribed === "1" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-foreground/80">
                Powiadomienia są włączone. Przypomnienie dotyczy tylko Twojego planu.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => void disable()}
              >
                Wyłącz
              </Button>
            </div>
          ) : null}
          {notificationsInBrowser && permission === "denied" ? (
            <p className="text-foreground/80">
              Powiadomienia są zablokowane w ustawieniach przeglądarki.
            </p>
          ) : null}
          {notificationsInBrowser && subscribed !== "1" && permission !== "denied" && planReady ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => void enable()}
            >
              Włącz powiadomienia
            </Button>
          ) : null}
          {notificationsInBrowser && subscribed !== "1" && permission !== "denied" && !planReady ? (
            <p className="text-foreground/80">
              Żeby dostawać przypomnienia o swoim kursie, najpierw{" "}
              <Link
                href="/lekcje"
                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
              >
                ustaw plan lekcji
              </Link>
              .
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Zamknij"
          onClick={() => {
            dismissPwaBanner();
          }}
        >
          <X />
        </Button>
      </div>
    </section>
  );
}
