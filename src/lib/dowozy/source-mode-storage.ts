import type { ScheduleSourceMode } from "./filter-url";

export const SOURCE_MODE_STORAGE_KEY = "school-bus.source-mode.v1";
const CHANGE_EVENT = "school-bus-source-mode";

export function parseSourceModePreference(
  raw: string | null | undefined,
): ScheduleSourceMode | null {
  if (raw === "school" || raw === "school-mzk") return raw;
  return null;
}

export function loadSourceModePreference(): ScheduleSourceMode | null {
  if (typeof window === "undefined") return null;

  try {
    return parseSourceModePreference(
      window.localStorage.getItem(SOURCE_MODE_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}

export function saveSourceModePreference(mode: ScheduleSourceMode): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(SOURCE_MODE_STORAGE_KEY, mode);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeSourceModePreference(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function getSourceModePreferenceSnapshot(): string {
  try {
    return window.localStorage.getItem(SOURCE_MODE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}
