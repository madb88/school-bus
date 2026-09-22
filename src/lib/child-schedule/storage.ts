import {
  EMPTY_LESSON_PLAN,
  LESSON_PLAN_STORAGE_KEY,
  type ChildLessonPlan,
  type DayLessonTimes,
  type WeekdayKey,
} from "./types";

function isWeekdayKey(value: unknown): value is WeekdayKey {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isTimeString(value: unknown): value is string {
  return typeof value === "string" && /^\d{1,2}:\d{2}$/.test(value);
}

function normalizeDay(value: unknown): DayLessonTimes | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!isTimeString(record.start)) return null;
  const day: DayLessonTimes = { start: record.start };
  if (isTimeString(record.end)) day.end = record.end;
  return day;
}

export function parseLessonPlan(raw: unknown): ChildLessonPlan {
  if (!raw || typeof raw !== "object") return { ...EMPTY_LESSON_PLAN, days: {} };

  const record = raw as Record<string, unknown>;
  const place =
    typeof record.place === "string" && record.place.trim()
      ? record.place.trim()
      : null;

  const days: ChildLessonPlan["days"] = {};
  const rawDays =
    record.days && typeof record.days === "object"
      ? (record.days as Record<string, unknown>)
      : {};

  for (const [key, value] of Object.entries(rawDays)) {
    const weekday = Number(key);
    if (!isWeekdayKey(weekday)) continue;
    const day = normalizeDay(value);
    if (day) days[weekday] = day;
  }

  return { place, days };
}

export function loadLessonPlan(): ChildLessonPlan {
  if (typeof window === "undefined") {
    return { ...EMPTY_LESSON_PLAN, days: {} };
  }

  try {
    const raw = window.localStorage.getItem(LESSON_PLAN_STORAGE_KEY);
    if (!raw) return { ...EMPTY_LESSON_PLAN, days: {} };
    return parseLessonPlan(JSON.parse(raw));
  } catch {
    return { ...EMPTY_LESSON_PLAN, days: {} };
  }
}

export function saveLessonPlan(plan: ChildLessonPlan): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LESSON_PLAN_STORAGE_KEY, JSON.stringify(plan));
  window.dispatchEvent(new Event("school-bus-lesson-plan"));
}

export function clearLessonPlan(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LESSON_PLAN_STORAGE_KEY);
  window.dispatchEvent(new Event("school-bus-lesson-plan"));
}

export function hasConfiguredLessons(plan: ChildLessonPlan): boolean {
  return Object.keys(plan.days).length > 0;
}
