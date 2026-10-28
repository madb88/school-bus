"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getSnapshot(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

/** Live `navigator.onLine` (defaults to online on the server). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
