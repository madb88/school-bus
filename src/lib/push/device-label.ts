export type DeviceDisplayName = {
  title: string;
  isCurrent: boolean;
};

function isIosUserAgent(ua: string): boolean {
  return /iPad|iPhone|iPod/.test(ua);
}

/** Human-readable label from a Web Push endpoint URL (no UA available for remote devices). */
export function pushEndpointLabel(endpoint: string): string {
  let host = "";
  try {
    host = new URL(endpoint).host.toLowerCase();
  } catch {
    return "Inna przeglądarka";
  }

  if (
    host === "web.push.apple.com" ||
    host.endsWith(".push.apple.com") ||
    host.includes("push.apple.com")
  ) {
    return "Safari (Apple)";
  }

  if (
    host === "fcm.googleapis.com" ||
    host === "android.googleapis.com" ||
    host.endsWith(".fcm.googleapis.com") ||
    host.includes("fcm.googleapis.com")
  ) {
    return "Chrome / Android";
  }

  if (
    host.includes("push.services.mozilla.com") ||
    host.includes("mozilla.com")
  ) {
    return "Firefox";
  }

  if (
    host.includes("notify.windows.com") ||
    host.startsWith("wns2-") ||
    host.includes("windows.com")
  ) {
    return "Edge / Windows";
  }

  return "Inna przeglądarka";
}

/** Browser / OS snippet for the device currently running this code. */
export function thisDeviceBrowserLabel(userAgent?: string): string {
  const fromLiveNav = userAgent === undefined;
  const ua =
    userAgent ??
    (typeof navigator !== "undefined" ? navigator.userAgent : "");
  let ios = isIosUserAgent(ua);
  if (
    fromLiveNav &&
    typeof navigator !== "undefined" &&
    navigator.platform === "MacIntel" &&
    navigator.maxTouchPoints > 1
  ) {
    ios = true;
  }

  if (ios) {
    if (/CriOS/i.test(ua)) return "Chrome (iPhone)";
    if (/FxiOS/i.test(ua)) return "Firefox (iPhone)";
    if (/EdgiOS/i.test(ua)) return "Edge (iPhone)";
    return "Safari (iPhone)";
  }

  if (/Android/i.test(ua)) {
    if (/EdgA/i.test(ua) || /Edg\//i.test(ua)) return "Edge (Android)";
    if (/Firefox/i.test(ua)) return "Firefox (Android)";
    return "Chrome (Android)";
  }

  if (/Edg\//i.test(ua)) return "Edge";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";

  return "Ta przeglądarka";
}

/** Title for the current browser: „To urządzenie · Safari (iPhone)”. */
export function thisDeviceLabel(
  userAgent?: string,
): string {
  return `To urządzenie · ${thisDeviceBrowserLabel(userAgent)}`;
}

export function deviceDisplayName(
  endpoint: string,
  currentEndpoint: string | null,
): DeviceDisplayName {
  const isCurrent =
    Boolean(currentEndpoint) && endpoint === currentEndpoint;
  if (isCurrent) {
    return { title: thisDeviceLabel(), isCurrent: true };
  }
  return { title: pushEndpointLabel(endpoint), isCurrent: false };
}
