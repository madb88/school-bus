"use client";

import { cn } from "cn";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  KINDS,
  KindRow,
  PlanRow,
} from "@/components/notifications/plan-row";
import { CARD_CLASS } from "@/components/notifications/styles";
import {
  accountPlanLabel,
  isAccountPlanId,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import { thisDeviceLabel } from "@/lib/push/device-label";
import type { PushKinds } from "@/lib/push/kinds";

export function NotificationsEnableSection({
  accountPlans,
  pushPlanIds,
  kinds,
  pending,
  isSubscribed,
  notificationsInBrowser,
  showDenied,
  showNeedPlan,
  showPlanPicker,
  canTest,
  planReady,
  onTogglePush,
  onTogglePlan,
  onToggleKind,
  onSendTest,
}: {
  accountPlans: AccountPlan[];
  pushPlanIds: string[];
  kinds: PushKinds;
  pending: boolean;
  isSubscribed: boolean;
  notificationsInBrowser: boolean;
  showDenied: boolean;
  showNeedPlan: boolean;
  showPlanPicker: boolean;
  canTest: boolean;
  planReady: boolean;
  onTogglePush: () => void;
  onTogglePlan: (id: string, checked: boolean) => void;
  onToggleKind: (id: keyof PushKinds, checked: boolean) => void;
  onSendTest: () => void;
}) {
  return (
    <section className="space-y-2.5">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">
          {thisDeviceLabel()}
        </h3>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Ustawienia powiadomień w tej przeglądarce.
        </p>
      </div>

      <div className={CARD_CLASS}>
        {notificationsInBrowser ? null : (
          <p className="text-sm leading-relaxed text-foreground/80">
            Na iPhonie powiadomienia włączysz po dodaniu aplikacji do ekranu
            początkowego i otwarciu jej z ikony.
          </p>
        )}
        {showDenied ? (
          <p className="text-sm leading-relaxed text-foreground/80">
            Powiadomienia są zablokowane w ustawieniach przeglądarki.
          </p>
        ) : null}

        <div className="space-y-2.5">
          <div className="flex min-h-6 items-center">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                isSubscribed
                  ? "bg-bus/15 text-bus-deep dark:text-bus"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isSubscribed ? "Włączone" : "Wyłączone"}
            </span>
          </div>
          <Button
            type="button"
            variant={isSubscribed ? "outline" : "default"}
            className="w-full"
            disabled={
              pending ||
              showDenied ||
              !notificationsInBrowser ||
              (!isSubscribed && !planReady)
            }
            onClick={onTogglePush}
          >
            {isSubscribed ? "Wyłącz powiadomienia" : "Włącz powiadomienia"}
          </Button>
        </div>

        {showNeedPlan ? (
          <p className="text-sm leading-relaxed text-foreground/80">
            Zapisz plan na koncie, żeby włączyć powiadomienia.{" "}
            <Link
              href="/lekcje"
              className={cn(
                buttonVariants({ variant: "link", size: "sm" }),
                "h-auto px-0",
              )}
            >
              Przejdź do planu lekcji
            </Link>
            .
          </p>
        ) : null}

        {showPlanPicker ? (
          <>
            <Separator className="bg-border/40" />
            <div className="space-y-2.5">
              <div className="space-y-0.5">
                <h4 className="text-sm font-semibold text-foreground">
                  Plany lekcji
                </h4>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Dla których planów przypominać na tym urządzeniu?
                </p>
              </div>
              <ul className="space-y-1.5">
                {accountPlans.map((plan, index) => {
                  if (!isAccountPlanId(plan.id)) return null;
                  const id = plan.id;
                  const checked = pushPlanIds.includes(id);
                  return (
                    <li key={id}>
                      <PlanRow
                        label={accountPlanLabel(plan, index)}
                        checked={checked}
                        disabled={pending}
                        onToggle={() => onTogglePlan(id, !checked)}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        ) : null}

        <Separator className="bg-border/40" />

        <div className="space-y-2.5">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-foreground">
              Rodzaje powiadomień
            </h4>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Jakie wiadomości chcesz dostawać na tym urządzeniu?
            </p>
          </div>
          <ul className="space-y-1">
            {KINDS.map((kind) => (
              <li key={kind.id}>
                <KindRow
                  title={kind.title}
                  description={kind.description}
                  icon={kind.icon}
                  checked={kinds[kind.id]}
                  disabled={pending}
                  onCheckedChange={(checked) => {
                    onToggleKind(kind.id, checked);
                  }}
                />
              </li>
            ))}
          </ul>
        </div>

        {canTest ? (
          <>
            <Separator className="bg-border/40" />
            <div className="space-y-2.5">
              <Button
                type="button"
                variant="default"
                className="w-full"
                disabled={pending}
                onClick={onSendTest}
              >
                Wyślij powiadomienie testowe
              </Button>
              <p className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Na komputerze działa w przeglądarce. Na telefonie dopiero w
                zainstalowanej aplikacji.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
