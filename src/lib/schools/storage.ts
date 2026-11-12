import { DEFAULT_CITY_ID, DEFAULT_SCHOOL_ID } from "./constants";
import type { SchoolSelection } from "./types";

export const SELECTED_CITY_STORAGE_KEY = "school-bus.selected-city.v1";
export const SELECTED_SCHOOL_STORAGE_KEY = "school-bus.selected-school.v1";
export const HIDE_SCHOOL_FILTER_STORAGE_KEY =
  "school-bus.hide-school-filter.v1";

const CITY_CHANGE_EVENT = "school-bus-selected-city";
const SCHOOL_CHANGE_EVENT = "school-bus-selected-school";
const HIDE_CHANGE_EVENT = "school-bus-hide-school-filter";

const ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSchoolEntityId(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || !ID_RE.test(trimmed)) return null;
  return trimmed;
}

function readId(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return parseSchoolEntityId(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeId(key: string, value: string | null, event: string): void {
  if (typeof window === "undefined") return;
  try {
    if (!value) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
    window.dispatchEvent(new Event(event));
  } catch {
    // ignore quota / private mode
  }
}

export function loadSelectedCityId(): string | null {
  return readId(SELECTED_CITY_STORAGE_KEY);
}

export function saveSelectedCityId(cityId: string | null): void {
  writeId(
    SELECTED_CITY_STORAGE_KEY,
    parseSchoolEntityId(cityId),
    CITY_CHANGE_EVENT,
  );
}

export function loadSelectedSchoolId(): string | null {
  return readId(SELECTED_SCHOOL_STORAGE_KEY);
}

export function saveSelectedSchoolId(schoolId: string | null): void {
  writeId(
    SELECTED_SCHOOL_STORAGE_KEY,
    parseSchoolEntityId(schoolId),
    SCHOOL_CHANGE_EVENT,
  );
}

export function loadSchoolSelection(): SchoolSelection | null {
  const cityId = loadSelectedCityId();
  const schoolId = loadSelectedSchoolId();
  if (!cityId || !schoolId) return null;
  return { cityId, schoolId };
}

export function saveSchoolSelection(selection: SchoolSelection): void {
  saveSelectedCityId(selection.cityId);
  saveSelectedSchoolId(selection.schoolId);
}

/** Soft-default used when nothing is stored yet. */
export function defaultSchoolSelection(): SchoolSelection {
  return { cityId: DEFAULT_CITY_ID, schoolId: DEFAULT_SCHOOL_ID };
}

export function loadHideSchoolFilter(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HIDE_SCHOOL_FILTER_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveHideSchoolFilter(hide: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      HIDE_SCHOOL_FILTER_STORAGE_KEY,
      hide ? "1" : "0",
    );
    window.dispatchEvent(new Event(HIDE_CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function subscribeSchoolSelection(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener(CITY_CHANGE_EVENT, onChange);
  window.addEventListener(SCHOOL_CHANGE_EVENT, onChange);
  window.addEventListener(HIDE_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CITY_CHANGE_EVENT, onChange);
    window.removeEventListener(SCHOOL_CHANGE_EVENT, onChange);
    window.removeEventListener(HIDE_CHANGE_EVENT, onChange);
  };
}

export function getSelectedSchoolSnapshot(): string {
  try {
    return window.localStorage.getItem(SELECTED_SCHOOL_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getSelectedCitySnapshot(): string {
  try {
    return window.localStorage.getItem(SELECTED_CITY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getHideSchoolFilterSnapshot(): string {
  try {
    return window.localStorage.getItem(HIDE_SCHOOL_FILTER_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}
