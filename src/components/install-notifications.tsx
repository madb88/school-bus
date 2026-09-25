"use client";

import { cn } from "cn";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLessonPlan } from "@/lib/child-schedule/use-lesson-plan";
import {
  disablePush,
  enablePush,
  getPwaUiServerSnapshot,
  getPwaUiSnapshot,
  planReadyForPush,
  sendTestPush,
  subscribePwaUi,
  syncStoredPushKinds,
} from "@/lib/push/browser";
import {
  getPushKindsServerSnapshot,
  getPushKindsSnapshot,
  pushKindsFromSnapshot,
  savePushKinds,
  subscribePushKinds,
  type PushKinds,
} from "@/lib/push/kinds";

const KINDS = [
  {
    id: "departure",
    title: "Odjazd do szkoły",
    description: "Około 20 minut przed kursem do szkoły.",
  },
  {
    id: "return",
    title: "Autobus powrotny",
    description: "Około 20 minut przed odjazdem ze szkoły.",
  },
  {
    id: "schedule",
    title: "Zmiana rozkładu",
    description: "Gdy zaktualizują się godziny dowozów i odwozów.",
  },
] as const;

export function InstallNotifications() {
  const plan = useLessonPlan();
  const ui = useSyncExternalStore(
    subscribePwaUi,
    getPwaUiSnapshot,
    getPwaUiServerSnapshot,
  );
  const kindsSnapshot = useSyncExternalStore(
    subscribePushKinds,
    getPushKindsSnapshot,
    getPushKindsServerSnapshot,
  );
  const kinds = pushKindsFromSnapshot(kindsSnapshot);
  const [ios, standalone, , permission, subscribed] = ui.split("|");
  const [pending, setPending] = useState(false);

  const notificationsInBrowser = ios !== "1" || standalone === "1";
  const planReady = planReadyForPush(plan);
  const isSubscribed = notificationsInBrowser && subscribed === "1";
  const showDenied = notificationsInBrowser && permission === "denied";
  const canToggle =
    notificationsInBrowser && permission !== "denied" && (isSubscribed || planReady);
  const showNeedPlan =
    notificationsInBrowser && !isSubscribed && permission !== "denied" && !planReady;
  const canTest = notificationsInBrowser && permission !== "denied";

  async function togglePush() {
    setPending(true);
    try {
      if (isSubscribed) {
        await disablePush();
        toast.success("Powiadomienia wyłączone");
        return;
      }
      const result = await enablePush(plan, kinds);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Powiadomienia włączone", {
        description: "Dostaniesz tylko te rodzaje, które są zaznaczone.",
      });
    } finally {
      setPending(false);
    }
  }

  async function sendTest() {
    setPending(true);
    try {
      const result = await sendTestPush();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Wysłane", {
        description: "Powiadomienie testowe powinno pojawić się za chwilę.",
      });
    } finally {
      setPending(false);
    }
  }

  async function toggleKind(id: keyof PushKinds, checked: boolean) {
    const next = { ...kinds, [id]: checked };
    savePushKinds(next);
    if (!isSubscribed) return;

    const result = await syncStoredPushKinds(next);
    if (!result.ok) {
      savePushKinds(kinds);
      toast.error(result.message);
    }
  }

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
        Włącz przypomnienia na tym telefonie i wybierz, które wiadomości chcesz
        dostawać.
      </p>

      <div className="space-y-4">
        {notificationsInBrowser ? null : (
          <p className="max-w-2xl text-sm leading-relaxed text-foreground/80">
            Na iPhonie powiadomienia włączysz po dodaniu aplikacji do ekranu
            początkowego i otwarciu jej z ikony.
          </p>
        )}
        {showDenied ? (
          <p className="max-w-2xl text-sm leading-relaxed text-foreground/80">
            Powiadomienia są zablokowane w ustawieniach przeglądarki.
          </p>
        ) : null}
        {canToggle ? (
          <Button
            type="button"
            size="sm"
            variant={isSubscribed ? "outline" : "secondary"}
            disabled={pending}
            onClick={() => void togglePush()}
          >
            {isSubscribed ? "Wyłącz powiadomienia" : "Włącz powiadomienia"}
          </Button>
        ) : null}
        {isSubscribed ? (
          <p className="text-sm text-foreground/80">
            Powiadomienia są włączone. Przypomnienie dotyczy tylko Twojego planu.
          </p>
        ) : null}
        {showNeedPlan ? (
          <p className="text-sm leading-relaxed text-foreground/80">
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

        <ul className="max-w-xl space-y-3">
          {KINDS.map((kind) => (
            <li key={kind.id}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-bus"
                  checked={kinds[kind.id]}
                  disabled={pending}
                  onChange={(event) => {
                    void toggleKind(kind.id, event.target.checked);
                  }}
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {kind.title}
                  </span>
                  <span className="block text-sm leading-relaxed text-muted-foreground">
                    {kind.description}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {canTest ? (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => void sendTest()}
            >
              Wyślij powiadomienie testowe
            </Button>
            <p className="text-sm text-foreground/80">
              Na Macu działa w Safari. Na iPhonie dopiero w zainstalowanej aplikacji.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
