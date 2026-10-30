import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSourceModePreferenceSnapshot,
  loadSourceModePreference,
  parseSourceModePreference,
  saveSourceModePreference,
  SOURCE_MODE_STORAGE_KEY,
} from "./source-mode-storage";

describe("parseSourceModePreference", () => {
  it("accepts known modes", () => {
    expect(parseSourceModePreference("school")).toBe("school");
    expect(parseSourceModePreference("school-mzk")).toBe("school-mzk");
  });

  it("rejects unknown values", () => {
    expect(parseSourceModePreference(null)).toBeNull();
    expect(parseSourceModePreference("")).toBeNull();
    expect(parseSourceModePreference("mzk")).toBeNull();
  });
});

describe("source mode localStorage", () => {
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

  it("round-trips preference", () => {
    expect(loadSourceModePreference()).toBeNull();
    saveSourceModePreference("school");
    expect(store.get(SOURCE_MODE_STORAGE_KEY)).toBe("school");
    expect(loadSourceModePreference()).toBe("school");
    expect(getSourceModePreferenceSnapshot()).toBe("school");
    saveSourceModePreference("school-mzk");
    expect(loadSourceModePreference()).toBe("school-mzk");
  });
});
