"use client";

import { useSyncExternalStore } from "react";
import { LESSON_PLAN_STORAGE_KEY, type ChildLessonPlan } from "./types";
import { parseLessonPlan } from "./storage";

const CHANGE_EVENT = "school-bus-lesson-plan";

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
    return window.localStorage.getItem(LESSON_PLAN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getServerSnapshot(): string {
  return "";
}

export function useLessonPlan(): ChildLessonPlan {
  const raw = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  try {
    return parseLessonPlan(raw ? JSON.parse(raw) : null);
  } catch {
    return parseLessonPlan(null);
  }
}
