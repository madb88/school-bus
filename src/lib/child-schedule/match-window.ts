import {
  DROPOFF_WINDOW_AFTER_END_MIN,
  PICKUP_WINDOW_BEFORE_START_MIN,
} from "./match";

export const LESSON_MATCH_WINDOW_STORAGE_KEY =
  "school-bus.lesson-match-window.v1";
const CHANGE_EVENT = "school-bus-lesson-match-window";

/** Shared default for pickup-before / dropoff-after windows. */
export const DEFAULT_LESSON_MATCH_WINDOW_MIN = Math.max(
  PICKUP_WINDOW_BEFORE_START_MIN,
  DROPOFF_WINDOW_AFTER_END_MIN,
);

export const MIN_LESSON_MATCH_WINDOW_MIN = 15;
export const MAX_LESSON_MATCH_WINDOW_MIN = 240;

export function clampLessonMatchWindow(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_LESSON_MATCH_WINDOW_MIN;
  return Math.min(
    MAX_LESSON_MATCH_WINDOW_MIN,
    Math.max(MIN_LESSON_MATCH_WINDOW_MIN, Math.round(value)),
  );
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
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeLessonMatchWindow(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
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
