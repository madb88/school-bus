"use client";

import { cn } from "cn";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
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

const KIND_SHORT: { id: keyof PushKinds; title: string }[] = [
  { id: "departure", title: "Odjazd" },
  { id: "return", title: "Powrót" },
  { id: "schedule", title: "Zmiana rozkładu" },
];

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
    return kept.length > 0 ? kept : savedPlanIds;
  })();

  const notificationsInBrowser = ios !== "1" || standalone === "1";
  const planReady = planReadyForPush(pushPlanIds);
  const isSubscribed = notificationsInBrowser && subscribed === "1";
  const showDenied = notificationsInBrowser && permission === "denied";
  const canToggle =
    notificationsInBrowser &&
    permission !== "denied" &&
    (isSubscribed || planReady);
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
    <div className="space-y-6">
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
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

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {thisDeviceLabel()}
          </h3>
          <p className="text-sm text-muted-foreground">
            Ustawienia powiadomień w tej przeglądarce.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4 dark:bg-muted/10 sm:p-5">
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

          <div className="flex flex-wrap items-center gap-2">
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
              <span className="inline-flex items-center rounded-full bg-bus/15 px-2.5 py-0.5 text-xs font-medium text-bus-deep dark:text-bus">
                Włączone
              </span>
            ) : null}
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
            <div className="space-y-3 border-t border-border/40 pt-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Plany lekcji
                </h4>
                <p className="text-sm text-muted-foreground">
                  Dla których planów przypominać na tym urządzeniu?
                </p>
              </div>
              {isSubscribed && pushPlanIds.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Powiadomienia dla:{" "}
                  {planNamesForIds(accountPlans, pushPlanIds).join(", ")}
                </p>
              ) : null}
              <ul className="space-y-2">
                {accountPlans.map((plan, index) => {
                  if (!isAccountPlanId(plan.id)) return null;
                  const id = plan.id;
                  return (
                    <li key={id}>
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 accent-bus"
                          checked={pushPlanIds.includes(id)}
                          disabled={pending}
                          onChange={(event) => {
                            togglePlan(id, event.target.checked);
                          }}
                        />
                        <span className="text-sm text-foreground">
                          {accountPlanLabel(plan, index)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-border/40 pt-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                Rodzaje powiadomień
              </h4>
              <p className="text-sm text-muted-foreground">
                Jakie wiadomości chcesz dostawać na tym urządzeniu?
              </p>
            </div>
            <ul className="space-y-3">
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
          </div>

          {canTest ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-border/40 pt-4">
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
                Na komputerze działa w przeglądarce. Na telefonie dopiero w
                zainstalowanej aplikacji.
              </p>
            </div>
          ) : null}

        </div>
      </section>

      {devicesLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie urządzeń…</p>
      ) : otherRows.length > 0 ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Inne urządzenia
            </h3>
            <p className="text-sm text-muted-foreground">
              Możesz zmienić plany i rodzaje powiadomień na innych urządzeniach
              z tego konta.
            </p>
          </div>
          <ul className="space-y-4">
            {otherRows.map((device) => {
              const busy = pendingDeviceId === device.id;
              const linkedNames = planNamesForIds(
                accountPlans,
                device.planIds,
              );
              return (
                <li
                  key={device.id}
                  className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4 dark:bg-muted/10 sm:p-5"
                  title={device.endpoint}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {device.title}
                    </p>
                    {linkedNames.length > 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Powiadomienia dla: {linkedNames.join(", ")}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Brak powiązanych planów
                      </p>
                    )}
                  </div>

                  {savedPlanIds.length > 0 ? (
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        Plany lekcji
                      </h4>
                      <ul className="space-y-2">
                        {accountPlans.map((plan, index) => {
                          if (!isAccountPlanId(plan.id)) return null;
                          const id = plan.id;
                          return (
                            <li key={id}>
                              <label className="flex cursor-pointer items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1 size-4 shrink-0 accent-bus"
                                  checked={device.planIds.includes(id)}
                                  disabled={busy}
                                  onChange={(event) => {
                                    const next = event.target.checked
                                      ? device.planIds.includes(id)
                                        ? device.planIds
                                        : [...device.planIds, id]
                                      : device.planIds.filter((x) => x !== id);
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
                                <span className="text-sm text-foreground">
                                  {accountPlanLabel(plan, index)}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}

                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      Rodzaje powiadomień
                    </h4>
                    <ul className="flex flex-wrap gap-x-4 gap-y-2">
                      {KIND_SHORT.map((kind) => (
                        <li key={kind.id}>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              className="size-4 shrink-0 accent-bus"
                              checked={device.kinds[kind.id]}
                              disabled={busy}
                              onChange={(event) => {
                                void saveOtherDevice(device, {
                                  kinds: {
                                    ...device.kinds,
                                    [kind.id]: event.target.checked,
                                  },
                                });
                              }}
                            />
                            <span className="text-sm text-foreground">
                              {kind.title}
                            </span>
                          </label>
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
    <section className="space-y-4 rounded-xl border border-border/50 bg-muted/20 p-4 dark:bg-muted/10 sm:space-y-5 sm:p-5">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          Gdzie włączone powiadomienia
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Podsumowanie: na których urządzeniach dany plan dostaje przypomnienia.
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      ) : (
        <ul className="space-y-4 sm:space-y-5">
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
                className="flex flex-col gap-2.5 border-b border-border/30 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:gap-5 sm:pb-5"
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
