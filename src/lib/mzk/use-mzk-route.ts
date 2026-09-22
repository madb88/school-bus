"use client";

import { useSyncExternalStore } from "react";
import {
  MZK_ROUTE_STORAGE_KEY,
  type MzkRoutePreference,
} from "./route-preference";
import { parseMzkRoutePreference } from "./route-storage";

const CHANGE_EVENT = "school-bus-mzk-route";

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getClientSnapshot(): string {
  try {
    return window.localStorage.getItem(MZK_ROUTE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

export function useMzkRoutePreference(): MzkRoutePreference {
  const raw = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  try {
    return parseMzkRoutePreference(raw ? JSON.parse(raw) : null);
  } catch {
    return parseMzkRoutePreference(null);
  }
}
