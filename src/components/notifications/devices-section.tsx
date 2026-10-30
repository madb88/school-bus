"use client";

import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import {
  KINDS,
  KindRow,
  PlanRow,
  planNamesForIds,
  type DeviceRow,
} from "@/components/notifications/plan-row";
import { CARD_CLASS } from "@/components/notifications/styles";
import {
  accountPlanLabel,
  isAccountPlanId,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import type { PushKinds } from "@/lib/push/kinds";

export function NotificationsDevicesSection({
  accountPlans,
  savedPlanIds,
  devicesLoading,
  otherRows,
  devicesCount,
  isSubscribed,
  pendingDeviceId,
  onSaveOtherDevice,
}: {
  accountPlans: AccountPlan[];
  savedPlanIds: string[];
  devicesLoading: boolean;
  otherRows: DeviceRow[];
  devicesCount: number;
  isSubscribed: boolean;
  pendingDeviceId: string | null;
  onSaveOtherDevice: (
    device: DeviceRow,
    patch: { planIds?: string[]; kinds?: PushKinds },
  ) => void;
}) {
  if (devicesLoading) {
    return <p className="text-sm text-muted-foreground">Ładowanie urządzeń…</p>;
  }

  if (otherRows.length > 0) {
    return (
      <section className="space-y-2.5">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">
            Inne urządzenia
          </h3>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Możesz zmienić plany i rodzaje powiadomień na innych urządzeniach z
            tego konta.
          </p>
        </div>
        <ul className="space-y-3">
          {otherRows.map((device) => {
            const busy = pendingDeviceId === device.id;
            const linkedNames = planNamesForIds(accountPlans, device.planIds);
            return (
              <li key={device.id} className={CARD_CLASS} title={device.endpoint}>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {device.title}
                  </p>
                  {linkedNames.length > 0 ? (
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Powiadomienia dla: {linkedNames.join(", ")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      Brak powiązanych planów
                    </p>
                  )}
                </div>

                {savedPlanIds.length > 0 ? (
                  <>
                    <Separator className="bg-border/40" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">
                        Plany lekcji
                      </h4>
                      <ul className="space-y-1.5">
                        {accountPlans.map((plan, index) => {
                          if (!isAccountPlanId(plan.id)) return null;
                          const id = plan.id;
                          const checked = device.planIds.includes(id);
                          return (
                            <li key={id}>
                              <PlanRow
                                label={accountPlanLabel(plan, index)}
                                checked={checked}
                                disabled={busy}
                                onToggle={() => {
                                  const next = checked
                                    ? device.planIds.filter((x) => x !== id)
                                    : device.planIds.includes(id)
                                      ? device.planIds
                                      : [...device.planIds, id];
                                  if (next.length === 0) {
                                    toast.error(
                                      "Wybierz przynajmniej jeden plan.",
                                    );
                                    return;
                                  }
                                  onSaveOtherDevice(device, {
                                    planIds: next,
                                  });
                                }}
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </>
                ) : null}

                <Separator className="bg-border/40" />

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    Rodzaje powiadomień
                  </h4>
                  <ul className="space-y-1">
                    {KINDS.map((kind) => (
                      <li key={kind.id}>
                        <KindRow
                          title={kind.title}
                          description={kind.description}
                          icon={kind.icon}
                          checked={device.kinds[kind.id]}
                          disabled={busy}
                          onCheckedChange={(checked) => {
                            onSaveOtherDevice(device, {
                              kinds: {
                                ...device.kinds,
                                [kind.id]: checked,
                              },
                            });
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (devicesCount <= 1 && isSubscribed) {
    return (
      <p className="text-sm text-muted-foreground">
        Masz powiadomienia włączone tylko na tym urządzeniu.
      </p>
    );
  }

  return null;
}
