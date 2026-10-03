"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY } from "@/components/theme-init";
import { ThemeScript } from "@/components/theme-script";

export type Theme = "light" | "dark";
export type ThemePreference = "system" | Theme;

type ThemeSnapshot = {
  theme: Theme;
  preference: ThemePreference;
};

type ThemeContextValue = {
  /** Resolved light or dark, including when the preference follows the system. */
  theme: Theme;
  preference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_CHANGE_EVENT = "school-bus-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function readDomTheme(): Theme {
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    /* ignore */
  }
  return "system";
}

function readStoredTheme(): Theme | null {
  const preference = readStoredPreference();
  return preference === "system" ? null : preference;
}

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function notifyThemeListeners() {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const onMediaChange = () => {
    if (readStoredTheme() === null) {
      applyTheme(systemTheme());
    }
    onStoreChange();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return;
    applyTheme(readStoredTheme() ?? systemTheme());
    onStoreChange();
  };

  const onLocalChange = () => onStoreChange();

  window.addEventListener(THEME_CHANGE_EVENT, onLocalChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onMediaChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onLocalChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onMediaChange);
  };
}

const SERVER_SNAPSHOT: ThemeSnapshot = { theme: "light", preference: "system" };

let snapshotKey = "";
let snapshot: ThemeSnapshot = SERVER_SNAPSHOT;

function getSnapshot(): ThemeSnapshot {
  const preference = readStoredPreference();
  const theme = readDomTheme();
  const key = `${preference}:${theme}`;
  if (key !== snapshotKey) {
    snapshotKey = key;
    snapshot = { preference, theme };
  }
  return snapshot;
}

function getServerSnapshot(): ThemeSnapshot {
  // Matches SSR + ThemeScript boot: first paint may already be dark on the
  // document, but React state stays light until hydration reads the DOM.
  return SERVER_SNAPSHOT;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, preference } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setThemePreference = useCallback((next: ThemePreference) => {
    applyTheme(next === "system" ? systemTheme() : next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    notifyThemeListeners();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preference, setThemePreference }}>
      <ThemeScript />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
