export type WeekdayKey = 1 | 2 | 3 | 4 | 5;

export type DayLessonTimes = {
  /** Godzina rozpoczęcia lekcji, np. "08:00" */
  start: string;
  /** Godzina zakończenia lekcji (pod odwozy), np. "14:00" */
  end?: string;
};

export type ChildLessonPlan = {
  place: string | null;
  days: Partial<Record<WeekdayKey, DayLessonTimes>>;
};

export const WEEKDAY_OPTIONS: { key: WeekdayKey; label: string }[] = [
  { key: 1, label: "Poniedziałek" },
  { key: 2, label: "Wtorek" },
  { key: 3, label: "Środa" },
  { key: 4, label: "Czwartek" },
  { key: 5, label: "Piątek" },
];

export const EMPTY_LESSON_PLAN: ChildLessonPlan = {
  place: null,
  days: {},
};

export const LESSON_PLAN_STORAGE_KEY = "school-bus.child-lesson-plan.v1";
