import { hasConfiguredLessons } from "@/lib/child-schedule/storage";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";

const DISMISS_KEY = "school-bus.pwa-banner.v2";
const UI_EVENT = "school-bus-pwa-banner";

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

export function isIosDevice(): boolean {
  const userAgent = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(userAgent);
  const iPadOs =
    window.navigator.platform === "MacIntel" &&
    window.navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

/** Desktop Safari. iPhone, iPad, and Chromium-on-Mac are excluded. */
export function isMacSafariUserAgent(userAgent: string): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return false;
  const isMac = /Macintosh|Mac OS X/.test(userAgent);
  const isSafari =
    /Safari\//.test(userAgent) &&
    !/Chrome|Chromium|CriOS|Edg\/|OPR\/|FxiOS|Firefox/.test(userAgent);
  return isMac && isSafari;
}

export function isMacSafari(): boolean {
  if (typeof window === "undefined" || isIosDevice()) return false;
  return isMacSafariUserAgent(window.navigator.userAgent);
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
  return "0|0|0|1|default|0";
}

export function getPwaUiSnapshot(): string {
  ensureSubscriptionCheck();
  const ios = isIosDevice() ? "1" : "0";
  const mac = isMacSafari() ? "1" : "0";
  const standalone = isStandaloneDisplay() ? "1" : "0";
  const dismissed = isPwaBannerDismissed() ? "1" : "0";
  const permission =
    "Notification" in window ? Notification.permission : "unsupported";
  const subscribed = pushSubscribed ? "1" : "0";
  return `${ios}|${mac}|${standalone}|${dismissed}|${permission}|${subscribed}`;
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

export function planReadyForPush(plan: ChildLessonPlan): boolean {
  return Boolean(plan.place) && hasConfiguredLessons(plan);
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function syncStoredPushPlan(plan: ChildLessonPlan): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;

  await fetch("/api/push/plan", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      plan,
    }),
  });
}

export async function enablePush(
  plan: ChildLessonPlan,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, message: "Ta przeglądarka nie obsługuje powiadomień." };
  }
  if (!planReadyForPush(plan)) {
    return { ok: false, message: "Najpierw ustaw miejsce i godziny w planie lekcji." };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (!publicKey) {
    return { ok: false, message: "Powiadomienia nie są jeszcze skonfigurowane." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, message: "Brak zgody na powiadomienia." };
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      plan,
    }),
  });

  if (!response.ok) {
    if (!existing) await subscription.unsubscribe();
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    return {
      ok: false,
      message: data?.error ?? "Nie udało się zapisać powiadomień.",
    };
  }

  pushSubscribed = true;
  notifyPwaUi();
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
