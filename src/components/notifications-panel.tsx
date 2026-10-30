"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { NotificationsDevicesSection } from "@/components/notifications/devices-section";
import { NotificationsEnableSection } from "@/components/notifications/enable-section";
import {
  PlansOverview,
  planIdsFromAccount,
  type DeviceRow,
} from "@/components/notifications/plan-row";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
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

      <NotificationsEnableSection
        accountPlans={accountPlans}
        pushPlanIds={pushPlanIds}
        kinds={kinds}
        pending={pending}
        isSubscribed={isSubscribed}
        notificationsInBrowser={notificationsInBrowser}
        showDenied={showDenied}
        showNeedPlan={showNeedPlan}
        showPlanPicker={showPlanPicker}
        canTest={canTest}
        planReady={planReady}
        onTogglePush={() => void togglePush()}
        onTogglePlan={togglePlan}
        onToggleKind={(id, checked) => {
          void toggleKind(id, checked);
        }}
        onSendTest={() => void sendTest()}
      />

      <NotificationsDevicesSection
        accountPlans={accountPlans}
        savedPlanIds={savedPlanIds}
        devicesLoading={devicesLoading}
        otherRows={otherRows}
        devicesCount={devices.length}
        isSubscribed={isSubscribed}
        pendingDeviceId={pendingDeviceId}
        onSaveOtherDevice={(device, patch) => {
          void saveOtherDevice(device, patch);
        }}
      />
    </div>
  );
}
