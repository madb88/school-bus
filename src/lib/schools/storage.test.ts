import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CITY_ID,
  DEFAULT_SCHOOL_ID,
} from "./constants";
import {
  HIDE_SCHOOL_FILTER_STORAGE_KEY,
  loadHideSchoolFilter,
  loadSchoolSelection,
  parseSchoolEntityId,
  saveHideSchoolFilter,
  saveSchoolSelection,
  SELECTED_CITY_STORAGE_KEY,
  SELECTED_SCHOOL_STORAGE_KEY,
} from "./storage";
import { resolveClientSchoolSelection } from "./resolve-selection";

describe("parseSchoolEntityId", () => {
  it("accepts UUIDs", () => {
    expect(parseSchoolEntityId(DEFAULT_SCHOOL_ID)).toBe(DEFAULT_SCHOOL_ID);
  });

  it("rejects junk", () => {
    expect(parseSchoolEntityId("not-a-uuid")).toBeNull();
    expect(parseSchoolEntityId("")).toBeNull();
  });
});

describe("school selection storage", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal("window", {
      localStorage: globalThis.localStorage,
      dispatchEvent: () => true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips city and school", () => {
    saveSchoolSelection({
      cityId: DEFAULT_CITY_ID,
      schoolId: DEFAULT_SCHOOL_ID,
    });
    expect(store.get(SELECTED_CITY_STORAGE_KEY)).toBe(DEFAULT_CITY_ID);
    expect(store.get(SELECTED_SCHOOL_STORAGE_KEY)).toBe(DEFAULT_SCHOOL_ID);
    expect(loadSchoolSelection()).toEqual({
      cityId: DEFAULT_CITY_ID,
      schoolId: DEFAULT_SCHOOL_ID,
    });
  });

  it("stores hide filter flag", () => {
    expect(loadHideSchoolFilter()).toBe(false);
    saveHideSchoolFilter(true);
    expect(store.get(HIDE_SCHOOL_FILTER_STORAGE_KEY)).toBe("1");
    expect(loadHideSchoolFilter()).toBe(true);
  });
});

describe("resolveClientSchoolSelection", () => {
  it("prefers URL over storage and account", () => {
    expect(
      resolveClientSchoolSelection({
        urlCityId: DEFAULT_CITY_ID,
        urlSchoolId: DEFAULT_SCHOOL_ID,
        storedCityId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        storedSchoolId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        accountCityId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        accountSchoolId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      }),
    ).toEqual({ cityId: DEFAULT_CITY_ID, schoolId: DEFAULT_SCHOOL_ID });
  });

  it("falls back to soft-default", () => {
    expect(resolveClientSchoolSelection({})).toEqual({
      cityId: DEFAULT_CITY_ID,
      schoolId: DEFAULT_SCHOOL_ID,
    });
  });
});
