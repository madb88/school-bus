import { isAccountPlanId } from "@/lib/child-schedule/account-plan";
import { parsePushKinds, type PushKinds } from "./kinds";
import {
  parseApplicationServerKey,
  urlBase64ToUint8Array,
} from "./vapid-key";

export {
  normalizeVapidPublicKey,
  parseApplicationServerKey,
  urlBase64ToUint8Array,
} from "./vapid-key";

const DISMISS_KEY = "school-bus.pwa-banner.v2";
const UI_EVENT = "school-bus-pwa-banner";

export type PushStatus = {
  subscribed: boolean;
  planIds: string[];
  kinds: PushKinds | null;
};

export type PushDevice = {
  id: string;
  endpoint: string;
  planIds: string[];
  kinds: PushKinds;
};

function pushClientErrorMessage(error: unknown): string {
  const name =
    error instanceof DOMException || error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
      return "Brak zgody na powiadomienia.";
    case "InvalidStateError":
      return "Service worker nie jest gotowy. Zamknij aplikację i otwórz ją ponownie z ikony, potem spróbuj znów.";
    case "InvalidAccessError":
      return "Przeglądarka odrzuciła klucz VAPID (InvalidAccessError). Sprawdź NEXT_PUBLIC_VAPID_PUBLIC_KEY w buildzie PWA.";
    case "AbortError":
      return "Przeglądarka przerwała włączanie. Zamknij aplikację z wielozadaniowości, otwórz z ikony i spróbuj ponownie.";
    case "NotSupportedError":
      return "Ta przeglądarka nie obsługuje powiadomień push.";
    default:
      return "Nie udało się włączyć powiadomień w tej przeglądarce.";
  }
}

export function isIosDevice(): boolean {
  const userAgent = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(userAgent);
  const iPadOs =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

export function isStandaloneDisplay(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function isPwaBannerDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPwaBanner(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new Event(UI_EVENT));
}

let pushSubscribed = false;
let subscriptionCheckStarted = false;

export function subscribePwaUi(onStoreChange: () => void): () => void {
  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(UI_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(UI_EVENT, onChange);
  };
}

/** Stable string for useSyncExternalStore. Hidden until the client snapshot arrives. */
export function getPwaUiServerSnapshot(): string {
  return "0|0|1|default|0";
}

export function getPwaUiSnapshot(): string {
  ensureSubscriptionCheck();
  const ios = isIosDevice() ? "1" : "0";
  const standalone = isStandaloneDisplay() ? "1" : "0";
  const dismissed = isPwaBannerDismissed() ? "1" : "0";
  const permission =
    "Notification" in window ? Notification.permission : "unsupported";
  const subscribed = pushSubscribed ? "1" : "0";
  return `${ios}|${standalone}|${dismissed}|${permission}|${subscribed}`;
}

function ensureSubscriptionCheck(): void {
  if (subscriptionCheckStarted || typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  subscriptionCheckStarted = true;
  void currentSubscription().then((subscription) => {
    pushSubscribed = Boolean(subscription);
    window.dispatchEvent(new Event(UI_EVENT));
  });
}

export function notifyPwaUi(): void {
  window.dispatchEvent(new Event(UI_EVENT));
}

/** At least one valid account-plan UUID (backend validates ownership / usable days). */
export function planReadyForPush(planIds: string[] | null | undefined): boolean {
  if (!Array.isArray(planIds) || planIds.length === 0) return false;
  return planIds.every(isAccountPlanId);
}

export function normalizePlanIds(planIds: unknown): string[] {
  if (!Array.isArray(planIds)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of planIds) {
    if (!isAccountPlanId(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

let registrationWarm: Promise<ServiceWorkerRegistration> | null = null;
let vapidPublicKeyWarm: string | null = null;
let vapidPublicKeyWarmPromise: Promise<string | null> | null = null;

/** @internal Vitest only — clears the SW / VAPID warm caches between tests. */
export function resetPushRegistrationWarmForTests(): void {
  registrationWarm = null;
  vapidPublicKeyWarm = null;
  vapidPublicKeyWarmPromise = null;
}

async function fetchRuntimeVapidPublicKey(): Promise<string | null> {
  try {
    const response = await fetch("/api/push/vapid-public", {
      cache: "no-store",
    });
    if (!response?.ok) return null;
    const data = (await response.json()) as { publicKey?: unknown };
    if (typeof data.publicKey !== "string") return null;
    return parseApplicationServerKey(data.publicKey) ? data.publicKey : null;
  } catch {
    return null;
  }
}

/** Runtime key (Railway) with NEXT_PUBLIC fallback for local/tests. */
async function resolveVapidPublicKey(): Promise<string | null> {
  if (vapidPublicKeyWarm) return vapidPublicKeyWarm;
  if (!vapidPublicKeyWarmPromise) {
    vapidPublicKeyWarmPromise = (async () => {
      const fromApi = await fetchRuntimeVapidPublicKey();
      if (fromApi) {
        vapidPublicKeyWarm = fromApi;
        return fromApi;
      }
      const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (fromEnv && parseApplicationServerKey(fromEnv)) {
        vapidPublicKeyWarm = fromEnv;
        return fromEnv;
      }
      return null;
    })().finally(() => {
      // Allow retry after a failed warm (missing env during early boot).
      if (!vapidPublicKeyWarm) vapidPublicKeyWarmPromise = null;
    });
  }
  return vapidPublicKeyWarmPromise;
}

/**
 * Ensure `/sw.js` is registered before waiting on `ready`.
 * On iOS PWA a first-tap enable can race the layout `PwaRegister` effect;
 * without an active worker `serviceWorker.ready` never settles and no
 * `/api/push/subscribe` request is sent.
 */
async function ensurePushRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (!existing) {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }
  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) {
    throw new DOMException(
      "Subscribing for push requires an active service worker",
      "InvalidStateError",
    );
  }
  if (!registration.pushManager) {
    throw new DOMException(
      "PushManager is not available on this registration",
      "NotSupportedError",
    );
  }
  return registration;
}

async function resolvePushRegistration(): Promise<ServiceWorkerRegistration> {
  if (!registrationWarm) {
    registrationWarm = ensurePushRegistration().catch((error) => {
      registrationWarm = null;
      throw error;
    });
  }
  return registrationWarm;
}

/** Prefetch SW + VAPID so the tap handler can `subscribe()` sooner (iOS gesture). */
export function warmPushServiceWorker(): void {
  void resolveVapidPublicKey();
  if (!("serviceWorker" in navigator)) return;
  void resolvePushRegistration().catch(() => {
    // Private mode / unsupported — enablePush will surface a clear error.
  });
}

/**
 * Prefer `pushManager.subscribe()` as the permission prompt (WebKit).
 * Do not call `Notification.requestPermission()` first — that burns the
 * user gesture; slow work before `subscribe()` then fails on iOS.
 */
async function subscribePushManager(
  registration: ServiceWorkerRegistration,
  applicationServerKey: Uint8Array<ArrayBuffer>,
): Promise<{ subscription: PushSubscription; created: boolean }> {
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return { subscription: existing, created: false };
  }

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    return { subscription, created: true };
  } catch (error) {
    // Stale subscription with a different VAPID key.
    if (
      error instanceof DOMException &&
      error.name === "InvalidStateError"
    ) {
      const stale = await registration.pushManager.getSubscription();
      if (stale) await stale.unsubscribe();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      return { subscription, created: true };
    }
    throw error;
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const registration = await resolvePushRegistration();
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/** Current Push endpoint for this browser, if any. */
export async function getCurrentPushEndpoint(): Promise<string | null> {
  const subscription = await currentSubscription();
  return subscription?.endpoint ?? null;
}

function errorMessage(
  data: { error?: string } | null,
  fallback: string,
): string {
  return data?.error ?? fallback;
}

/** Replace this device's linked account plans. */
export async function setPushPlans(planIds: string[]): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const ids = normalizePlanIds(planIds);
  if (ids.length === 0) {
    return { ok: false, message: "Najpierw zapisz plan lekcji na koncie." };
  }

  const subscription = await currentSubscription();
  if (!subscription) return { ok: true };

  const response = await fetch("/api/push/plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      planIds: ids,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      message: errorMessage(
        data,
        "Nie udało się zaktualizować planów powiadomień.",
      ),
    };
  }

  return { ok: true };
}

export async function enablePush(
  planIds: string[],
  kinds: PushKinds,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "Ta przeglądarka nie obsługuje powiadomień." };
  }
  const ids = normalizePlanIds(planIds);
  if (!planReadyForPush(ids)) {
    return { ok: false, message: "Najpierw zapisz plan lekcji na koncie." };
  }

  const publicKey = await resolveVapidPublicKey();
  if (!publicKey) {
    return {
      ok: false,
      message:
        "Brak poprawnego publicznego klucza VAPID na serwerze (P-256). Ustaw VAPID_PUBLIC_KEY w Variables serwisu Next na Railway.",
    };
  }
  const applicationServerKey = parseApplicationServerKey(publicKey);
  if (!applicationServerKey) {
    return {
      ok: false,
      message:
        "Brak poprawnego publicznego klucza VAPID na serwerze (P-256). Ustaw VAPID_PUBLIC_KEY w Variables serwisu Next na Railway.",
    };
  }

  // WebKit: let subscribe() own the permission prompt; keep it close to the tap.
  let created = false;
  let subscription: PushSubscription;
  try {
    const registration = await resolvePushRegistration();
    const result = await subscribePushManager(
      registration,
      applicationServerKey,
    );
    subscription = result.subscription;
    created = result.created;
  } catch (error) {
    notifyPwaUi();
    return { ok: false, message: pushClientErrorMessage(error) };
  }
  notifyPwaUi();

  let response: Response;
  try {
    response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        planIds: ids,
        kinds,
      }),
    });
  } catch {
    if (created) {
      try {
        await subscription.unsubscribe();
      } catch {
        // ignore
      }
    }
    return { ok: false, message: "Nie udało się połączyć z serwerem." };
  }

  if (!response.ok) {
    if (created) {
      try {
        await subscription.unsubscribe();
      } catch {
        // ignore
      }
    }
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      message: errorMessage(data, "Nie udało się zapisać powiadomień."),
    };
  }

  pushSubscribed = true;
  notifyPwaUi();
  return { ok: true };
}

/** Hydrate this device's push set from the backend (keyed by subscription). */
export async function getPushStatus(): Promise<PushStatus> {
  const empty: PushStatus = { subscribed: false, planIds: [], kinds: null };
  const subscription = await currentSubscription();
  if (!subscription) return empty;

  const response = await fetch("/api/push/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  if (!response.ok) return empty;

  const data = (await response.json().catch(() => null)) as {
    subscribed?: unknown;
    planIds?: unknown;
    kinds?: unknown;
  } | null;

  const subscribed = data?.subscribed === true;
  if (subscribed !== pushSubscribed) {
    pushSubscribed = subscribed;
    notifyPwaUi();
  }

  return {
    subscribed,
    planIds: normalizePlanIds(data?.planIds),
    kinds: data?.kinds != null ? parsePushKinds(data.kinds) : null,
  };
}

function parsePushDevice(value: unknown): PushDevice | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return null;
  if (typeof record.endpoint !== "string" || !record.endpoint) return null;
  const planIds = normalizePlanIds(record.planIds);
  return {
    id: record.id,
    endpoint: record.endpoint,
    planIds,
    kinds: parsePushKinds(record.kinds),
  };
}

/** List this user's push devices (one per endpoint). Needs Plus / admin. */
export async function listMyDevices(
  userId: string,
): Promise<
  { ok: true; devices: PushDevice[] } | { ok: false; message: string }
> {
  if (!userId.trim()) {
    return { ok: false, message: "Brak identyfikatora konta." };
  }

  const response = await fetch(
    `/api/push/by-user/${encodeURIComponent(userId)}`,
    { method: "GET" },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      message: errorMessage(data, "Nie udało się wczytać urządzeń."),
    };
  }

  const data = (await response.json().catch(() => null)) as unknown;
  const list = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { devices?: unknown }).devices)
      ? (data as { devices: unknown[] }).devices
      : null;

  if (!list) {
    return { ok: false, message: "Nie udało się wczytać urządzeń." };
  }

  const devices: PushDevice[] = [];
  for (const item of list) {
    const device = parsePushDevice(item);
    if (device) devices.push(device);
  }
  return { ok: true, devices };
}

/** Update another (or this) device by subscription record id — no device keys. */
export async function updateDeviceSubscription(
  id: string,
  patch: { planIds?: string[]; kinds?: PushKinds },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!id.trim()) {
    return { ok: false, message: "Brak identyfikatora urządzenia." };
  }

  const body: { planIds?: string[]; kinds?: PushKinds } = {};
  if (patch.planIds !== undefined) {
    const ids = normalizePlanIds(patch.planIds);
    if (ids.length === 0) {
      return { ok: false, message: "Wybierz przynajmniej jeden plan." };
    }
    body.planIds = ids;
  }
  if (patch.kinds !== undefined) {
    body.kinds = patch.kinds;
  }
  if (body.planIds === undefined && body.kinds === undefined) {
    return { ok: false, message: "Brak zmian do zapisania." };
  }

  const response = await fetch(
    `/api/push/subscriptions/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      message: errorMessage(data, "Nie udało się zaktualizować urządzenia."),
    };
  }

  return { ok: true };
}

/** One-off push to this browser. Does not require a lesson plan. */
export async function sendTestPush(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return { ok: false, message: "Ta przeglądarka nie obsługuje powiadomień." };
  }

  const publicKey = await resolveVapidPublicKey();
  if (!publicKey) {
    return {
      ok: false,
      message:
        "Brak poprawnego publicznego klucza VAPID na serwerze (P-256). Ustaw VAPID_PUBLIC_KEY w Variables serwisu Next na Railway.",
    };
  }
  const applicationServerKey = parseApplicationServerKey(publicKey);
  if (!applicationServerKey) {
    return {
      ok: false,
      message:
        "Brak poprawnego publicznego klucza VAPID na serwerze (P-256). Ustaw VAPID_PUBLIC_KEY w Variables serwisu Next na Railway.",
    };
  }

  let created = false;
  let subscription: PushSubscription;
  try {
    const registration = await resolvePushRegistration();
    const result = await subscribePushManager(
      registration,
      applicationServerKey,
    );
    subscription = result.subscription;
    created = result.created;
  } catch (error) {
    notifyPwaUi();
    return { ok: false, message: pushClientErrorMessage(error) };
  }
  notifyPwaUi();

  const response = await fetch("/api/push/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  if (!response.ok) {
    if (created) {
      try {
        await subscription.unsubscribe();
      } catch {
        // ignore
      }
    }
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      message: errorMessage(
        data,
        "Nie udało się wysłać powiadomienia testowego.",
      ),
    };
  }

  return { ok: true };
}

export async function syncStoredPushKinds(kinds: PushKinds): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const subscription = await currentSubscription();
  if (!subscription) return { ok: true };

  const response = await fetch("/api/push/kinds", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      kinds,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      message: errorMessage(data, "Nie udało się zapisać wyboru powiadomień."),
    };
  }

  return { ok: true };
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (subscription) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
    await subscription.unsubscribe();
  }
  pushSubscribed = false;
  notifyPwaUi();
}
