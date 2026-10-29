/** Static HTML gate for offline users without Plan Plus (no Next app shell). */
export const STATIC_OFFLINE_GATE_PATH = "/offline.html" as const;

/** Hard-navigate to the prebuilt offline HTML page (centered no-access / cold start). */
export function goToStaticOfflineGate(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path === STATIC_OFFLINE_GATE_PATH || path.endsWith("/offline.html")) {
    return;
  }
  window.location.replace(STATIC_OFFLINE_GATE_PATH);
}
