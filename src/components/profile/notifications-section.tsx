"use client";

import { NotificationsPanel } from "@/components/notifications-panel";
import { HelpContactCard } from "@/components/profile/help-contact-card";
import { Button } from "@/components/ui/button";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";

export function NotificationsSection({
  userId,
  plusAccess,
  pushUiEnabled,
  accountPlans,
  onOpenPlus,
}: {
  userId: string;
  plusAccess: boolean;
  pushUiEnabled: boolean;
  accountPlans: AccountPlan[];
  onOpenPlus: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="hidden font-display text-xl font-semibold tracking-tight text-asphalt sm:block sm:text-2xl">
          Powiadomienia
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Przypomnienia o odjeździe autobusu szkolnego.
        </p>
      </div>
      {pushUiEnabled && plusAccess ? (
        <NotificationsPanel userId={userId} accountPlans={accountPlans} />
      ) : null}
      {pushUiEnabled && !plusAccess ? (
        <div className="space-y-4 rounded-2xl bg-muted/40 p-5 dark:bg-muted/20">
          <p className="text-base leading-relaxed text-foreground">
            Powiadomienia wymagają aktywnego Planu Plus.
          </p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onOpenPlus}
          >
            Zobacz Pakiet Plus
          </Button>
        </div>
      ) : null}
      {!pushUiEnabled ? (
        <p className="text-base leading-relaxed text-muted-foreground">
          Powiadomienia nie są jeszcze dostępne.
        </p>
      ) : null}
      <HelpContactCard />
    </div>
  );
}
