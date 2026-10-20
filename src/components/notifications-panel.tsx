"use client";

import { cn } from "cn";
import {
  Bus,
  CalendarClock,
  Check,
  School,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  accountPlanLabel,
  isAccountPlanId,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";
import {
  disablePush,
  enablePush,
  getCurrentPushEndpoint,
  getPushStatus,
  getPwaUiServerSnapshot,
  getPwaUiSnapshot,
  listMyDevices,
  planReadyForPush,
  sendTestPush,
  setPushPlans,
  subscribePwaUi,
  syncStoredPushKinds,
  updateDeviceSubscription,
  warmPushServiceWorker,
  type PushDevice,
} from "@/lib/push/browser";
import {
  deviceDisplayName,
  thisDeviceLabel,
} from "@/lib/push/device-label";
import {
  DEFAULT_PUSH_KINDS,
  getPushKindsServerSnapshot,
  getPushKindsSnapshot,
  pushKindsFromSnapshot,
  savePushKinds,
  subscribePushKinds,
  type PushKinds,
} from "@/lib/push/kinds";

const KINDS: {
  id: keyof PushKinds;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "departure",
    title: "Odjazd do szkoły",
    description: "Około 20 minut przed kursem do szkoły.",
    icon: School,
  },
  {
    id: "return",
    title: "Autobus powrotny",
    description: "Około 20 minut przed odjazdem ze szkoły.",
    icon: Bus,
  },
  {
    id: "schedule",
    title: "Zmiana rozkładu",
    description: "Gdy zaktualizują się godziny dowozów i odwozów.",
    icon: CalendarClock,
  },
];

const CARD_CLASS =
  "space-y-3 rounded-xl border border-border/60 bg-background p-3.5 sm:p-4";

function planIdsFromAccount(plans: AccountPlan[]): string[] {
  return plans
    .map((plan) => plan.id)
    .filter((id): id is string => isAccountPlanId(id));
}

function planNamesForIds(
  accountPlans: AccountPlan[],
  planIds: string[],
): string[] {
  const names: string[] = [];
  for (const id of planIds) {
    const index = accountPlans.findIndex((plan) => plan.id === id);
    if (index < 0) continue;
    names.push(accountPlanLabel(accountPlans[index]!, index));
  }
  return names;
}

type DeviceRow = {
  id: string;
  endpoint: string;
  planIds: string[];
  kinds: PushKinds;
  title: string;
  isCurrent: boolean;
};

export function NotificationsPanel({
  userId,
  accountPlans,
}: {
  userId: string;
  accountPlans: AccountPlan[];
}) {
  const savedPlanIds = planIdsFromAccount(accountPlans);
  const [chosenPlanIds, setChosenPlanIds] = useState<string[] | null>(null);
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);

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

  const available = new Set(savedPlanIds);
  const pushPlanIds = (() => {
    if (chosenPlanIds === null) return savedPlanIds;
    const kept = chosenPlanIds.filter((id) => available.has(id));
    // Explicit empty selection must stay empty so toggle on/off works on
    // the same plan. Fall back only when all chosen IDs vanished (deleted).
    if (kept.length > 0) return kept;
    if (chosenPlanIds.length === 0) return [];
    return savedPlanIds;
  })();

  const notificationsInBrowser = ios !== "1" || standalone === "1";
  const planReady = planReadyForPush(pushPlanIds);
  const isSubscribed = notificationsInBrowser && subscribed === "1";
  const showDenied = notificationsInBrowser && permission === "denied";
  const showNeedPlan =
    notificationsInBrowser &&
    !isSubscribed &&
    permission !== "denied" &&
    savedPlanIds.length === 0;
  const canTest = notificationsInBrowser && permission !== "denied";
  const showPlanPicker = savedPlanIds.length > 0;

  async function reloadDevices() {
    const [listResult, endpoint] = await Promise.all([
      listMyDevices(userId),
      getCurrentPushEndpoint(),
    ]);
    setCurrentEndpoint(endpoint);
    if (!listResult.ok) {
      toast.error(listResult.message);
      setDevices([]);
      return;
    }
    setDevices(listResult.devices);
  }

  useEffect(() => {
    warmPushServiceWorker();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await getPushStatus();
      if (cancelled) return;
      if (status.subscribed && status.planIds.length > 0) {
        setChosenPlanIds(status.planIds);
        if (status.kinds) savePushKinds(status.kinds);
      } else {
        setChosenPlanIds(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setDevicesLoading(true);
      const [listResult, endpoint] = await Promise.all([
        listMyDevices(userId),
        getCurrentPushEndpoint(),
      ]);
      if (cancelled) return;
      setCurrentEndpoint(endpoint);
      if (!listResult.ok) {
        toast.error(listResult.message);
        setDevices([]);
      } else {
        setDevices(listResult.devices);
      }
      setDevicesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const deviceRows: DeviceRow[] = devices.map((device) => {
    const display = deviceDisplayName(device.endpoint, currentEndpoint);
    return {
      id: device.id,
      endpoint: device.endpoint,
      planIds: device.planIds,
      kinds: device.kinds ?? DEFAULT_PUSH_KINDS,
      title: display.isCurrent ? thisDeviceLabel() : display.title,
      isCurrent: display.isCurrent,
    };
  });

  const otherRows = deviceRows.filter((row) => !row.isCurrent);

  async function applyPlanIds(next: string[]) {
    setChosenPlanIds(next);
    if (!isSubscribed) return;

    if (next.length === 0) {
      await disablePush();
      toast.message("Powiadomienia wyłączono");
      await reloadDevices();
      return;
    }

    const result = await setPushPlans(next);
    if (!result.ok) {
      toast.error(result.message);
      const status = await getPushStatus();
      if (status.subscribed) setChosenPlanIds(status.planIds);
      return;
    }
    toast.success("Zaktualizowano powiadomienia", {
      description: "Zmieniono plany na tym urządzeniu.",
    });
    await reloadDevices();
  }

  function togglePlan(id: string, checked: boolean) {
    const next = checked
      ? pushPlanIds.includes(id)
        ? pushPlanIds
        : [...pushPlanIds, id]
      : pushPlanIds.filter((x) => x !== id);
    void applyPlanIds(next);
  }

  async function togglePush() {
    setPending(true);
    try {
      if (isSubscribed) {
        await disablePush();
        toast.success("Powiadomienia wyłączone");
        await reloadDevices();
        return;
      }
      if (!planReadyForPush(pushPlanIds)) {
        toast.error("Najpierw zapisz plan lekcji na koncie.");
        return;
      }
      const result = await enablePush(pushPlanIds, kinds);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Powiadomienia włączone", {
        description: "Dostaniesz tylko te rodzaje, które są zaznaczone.",
      });
      await reloadDevices();
    } catch {
      toast.error("Nie udało się zmienić powiadomień. Spróbuj ponownie.");
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
      return;
    }
    toast.success("Zaktualizowano powiadomienia", {
      description: "Zmieniono rodzaje na tym urządzeniu.",
    });
  }

  async function saveOtherDevice(
    device: DeviceRow,
    patch: { planIds?: string[]; kinds?: PushKinds },
  ) {
    setPendingDeviceId(device.id);
    try {
      const result = await updateDeviceSubscription(device.id, patch);
      if (!result.ok) {
        toast.error(result.message);
        await reloadDevices();
        return;
      }
      setDevices((prev) =>
        prev.map((item) =>
          item.id === device.id
            ? {
                ...item,
                planIds: patch.planIds ?? item.planIds,
                kinds: patch.kinds ?? item.kinds,
              }
            : item,
        ),
      );
      toast.success("Zaktualizowano powiadomienia", {
        description: patch.planIds
          ? `Zmieniono plany na: ${device.title}.`
          : `Zmieniono rodzaje na: ${device.title}.`,
      });
    } finally {
      setPendingDeviceId(null);
    }
  }

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Włącz przypomnienia na tym telefonie lub komputerze i wybierz, dla
        których planów mają przychodzić. Na razie obejmują tylko autobus
        szkolny, nie autobus miejski.
      </p>

      {savedPlanIds.length > 0 ? (
        <PlansOverview
          accountPlans={accountPlans}
          deviceRows={deviceRows}
          currentSubscribed={isSubscribed}
          currentPlanIds={isSubscribed ? pushPlanIds : []}
          currentTitle={thisDeviceLabel()}
          loading={devicesLoading}
        />
      ) : null}

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
              onClick={() => void togglePush()}
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
                          onToggle={() => togglePlan(id, !checked)}
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
                      void toggleKind(kind.id, checked);
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
                  onClick={() => void sendTest()}
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

      {devicesLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie urządzeń…</p>
      ) : otherRows.length > 0 ? (
        <section className="space-y-2.5">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-foreground">
              Inne urządzenia
            </h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Możesz zmienić plany i rodzaje powiadomień na innych urządzeniach
              z tego konta.
            </p>
          </div>
          <ul className="space-y-3">
            {otherRows.map((device) => {
              const busy = pendingDeviceId === device.id;
              const linkedNames = planNamesForIds(
                accountPlans,
                device.planIds,
              );
              return (
                <li
                  key={device.id}
                  className={CARD_CLASS}
                  title={device.endpoint}
                >
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
                                    void saveOtherDevice(device, {
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
                              void saveOtherDevice(device, {
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
      ) : !devicesLoading && devices.length <= 1 ? (
        <p className="text-sm text-muted-foreground">
          {isSubscribed
            ? "Masz powiadomienia włączone tylko na tym urządzeniu."
            : null}
        </p>
      ) : null}
    </div>
  );
}

function PlanRow({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        checked
          ? "border-bus/40 bg-bus/5 text-foreground"
          : "border-border/50 bg-background text-foreground hover:bg-muted/40",
      )}
    >
      <span className="min-w-0 text-sm font-medium">{label}</span>
      <span
        aria-hidden
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full transition-colors",
          checked
            ? "bg-bus text-bus-foreground"
            : "border border-border/70 bg-transparent",
        )}
      >
        {checked ? <Check className="size-3 stroke-[3]" /> : null}
      </span>
    </button>
  );
}

function KindRow({
  title,
  description,
  icon: Icon,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 py-2 has-disabled:cursor-not-allowed has-disabled:opacity-50">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-md bg-bus/10 text-bus"
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="block text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {description}
        </span>
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}

function PlansOverview({
  accountPlans,
  deviceRows,
  currentSubscribed,
  currentPlanIds,
  currentTitle,
  loading,
}: {
  accountPlans: AccountPlan[];
  deviceRows: DeviceRow[];
  currentSubscribed: boolean;
  currentPlanIds: string[];
  currentTitle: string;
  loading: boolean;
}) {
  return (
    <section
      className={cn(CARD_CLASS, "sm:space-y-4")}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          Gdzie włączone powiadomienia
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          Podsumowanie: na których urządzeniach dany plan dostaje przypomnienia.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : (
        <ul className="space-y-3 sm:space-y-4">
          {accountPlans.map((plan, index) => {
            if (!isAccountPlanId(plan.id)) return null;
            const id = plan.id;
            const names = new Set<string>();
            for (const row of deviceRows) {
              if (!row.planIds.includes(id)) continue;
              names.add(row.title);
            }
            // Current device may not be in listMyDevices yet after enable,
            // or list is stale — also reflect local subscribe state.
            if (currentSubscribed && currentPlanIds.includes(id)) {
              names.add(currentTitle);
            }
            const list = [...names];
            return (
              <li
                key={id}
                className="flex flex-col gap-2 border-b border-border/30 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:gap-5 sm:pb-4"
              >
                <span className="shrink-0 text-sm font-medium leading-relaxed text-foreground sm:min-w-[8rem]">
                  {accountPlanLabel(plan, index)}
                </span>
                {list.length > 0 ? (
                  <span className="flex flex-wrap gap-2">
                    {list.map((name) => (
                      <span
                        key={name}
                        className="inline-flex max-w-full rounded-full bg-muted px-2.5 py-1 text-xs font-medium leading-relaxed text-foreground"
                      >
                        {name}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    Brak urządzeń
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
