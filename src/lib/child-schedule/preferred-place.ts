export const PREFERRED_PLACE_STORAGE_KEY = "school-bus.preferred-place.v1";
const CHANGE_EVENT = "school-bus-preferred-place";

export function loadPreferredPlace(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PREFERRED_PLACE_STORAGE_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function savePreferredPlace(place: string | null): void {
  if (typeof window === "undefined") return;

  try {
    if (!place) {
      window.localStorage.removeItem(PREFERRED_PLACE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PREFERRED_PLACE_STORAGE_KEY, place);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore quota / private mode
  }
}

export function subscribePreferredPlace(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function getPreferredPlaceSnapshot(): string {
  try {
    return window.localStorage.getItem(PREFERRED_PLACE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}
