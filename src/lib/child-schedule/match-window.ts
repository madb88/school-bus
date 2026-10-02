export const LESSON_MATCH_WINDOW_STORAGE_KEY =
  "school-bus.lesson-match-window.v1";
export const LESSON_MATCH_WINDOW_ENABLED_STORAGE_KEY =
  "school-bus.lesson-match-window-enabled.v1";
const CHANGE_EVENT = "school-bus-lesson-match-window";

export const MIN_LESSON_MATCH_WINDOW_MIN = 15;
export const MAX_LESSON_MATCH_WINDOW_MIN = 240;
/** Default pickup-before / dropoff-after window (minutes). */
export const DEFAULT_LESSON_MATCH_WINDOW_MIN = MAX_LESSON_MATCH_WINDOW_MIN;
export const DEFAULT_LESSON_MATCH_WINDOW_ENABLED = true;

export function clampLessonMatchWindow(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LESSON_MATCH_WINDOW_MIN;
  return Math.min(
    MAX_LESSON_MATCH_WINDOW_MIN,
    Math.max(MIN_LESSON_MATCH_WINDOW_MIN, Math.round(value)),
  );
}

/** Minutes used for matching; unlimited when the window filter is off. */
export function effectiveLessonMatchWindowMin(
  minutes: number,
  enabled: boolean,
): number {
  return enabled
    ? clampLessonMatchWindow(minutes)
    : Number.POSITIVE_INFINITY;
}

function subscribeMatchWindowStore(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function dispatchMatchWindowChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function loadLessonMatchWindow(): number {
  if (typeof window === "undefined") return DEFAULT_LESSON_MATCH_WINDOW_MIN;

  try {
    const raw = window.localStorage.getItem(LESSON_MATCH_WINDOW_STORAGE_KEY);
    if (!raw) return DEFAULT_LESSON_MATCH_WINDOW_MIN;
    return clampLessonMatchWindow(Number(raw));
  } catch {
    return DEFAULT_LESSON_MATCH_WINDOW_MIN;
  }
}

export function saveLessonMatchWindow(minutes: number): void {
  if (typeof window === "undefined") return;

  try {
    const next = clampLessonMatchWindow(minutes);
    window.localStorage.setItem(
      LESSON_MATCH_WINDOW_STORAGE_KEY,
      String(next),
    );
    dispatchMatchWindowChange();
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeLessonMatchWindow(onStoreChange: () => void) {
  return subscribeMatchWindowStore(onStoreChange);
}

export function getLessonMatchWindowSnapshot(): string {
  try {
    return (
      window.localStorage.getItem(LESSON_MATCH_WINDOW_STORAGE_KEY) ??
      String(DEFAULT_LESSON_MATCH_WINDOW_MIN)
    );
  } catch {
    return String(DEFAULT_LESSON_MATCH_WINDOW_MIN);
  }
}

export function loadLessonMatchWindowEnabled(): boolean {
  if (typeof window === "undefined") return DEFAULT_LESSON_MATCH_WINDOW_ENABLED;

  try {
    const raw = window.localStorage.getItem(
      LESSON_MATCH_WINDOW_ENABLED_STORAGE_KEY,
    );
    if (raw === null) return DEFAULT_LESSON_MATCH_WINDOW_ENABLED;
    return raw === "1" || raw === "true";
  } catch {
    return DEFAULT_LESSON_MATCH_WINDOW_ENABLED;
  }
}

export function saveLessonMatchWindowEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LESSON_MATCH_WINDOW_ENABLED_STORAGE_KEY,
      enabled ? "1" : "0",
    );
    dispatchMatchWindowChange();
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeLessonMatchWindowEnabled(onStoreChange: () => void) {
  return subscribeMatchWindowStore(onStoreChange);
}

export function getLessonMatchWindowEnabledSnapshot(): string {
  try {
    const raw = window.localStorage.getItem(
      LESSON_MATCH_WINDOW_ENABLED_STORAGE_KEY,
    );
    if (raw === null) {
      return DEFAULT_LESSON_MATCH_WINDOW_ENABLED ? "1" : "0";
    }
    return raw === "1" || raw === "true" ? "1" : "0";
  } catch {
    return DEFAULT_LESSON_MATCH_WINDOW_ENABLED ? "1" : "0";
  }
}
