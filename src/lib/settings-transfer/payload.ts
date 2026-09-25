import {
  clampLessonMatchWindow,
  DEFAULT_LESSON_MATCH_WINDOW_MIN,
} from "@/lib/child-schedule/match-window";
import {
  hasConfiguredLessons,
  parseLessonPlan,
} from "@/lib/child-schedule/storage";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import {
  hasConfiguredMzkRoute,
  parseMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import type { MzkRoutePreference } from "@/lib/mzk/route-preference";
import {
  SETTINGS_TRANSFER_SCHEMA_VERSION,
  SETTINGS_TRANSFER_TTL_SEC,
  type SettingsTransferPayload,
  type SettingsTransferSummary,
} from "./types";

export type BuildTransferInput = {
  lessonPlan: ChildLessonPlan;
  mzkRoute: MzkRoutePreference;
  matchWindowMin?: number | null;
};

export function buildSettingsTransferPayload(
  input: BuildTransferInput,
): SettingsTransferPayload | { error: string } {
  const lessonPlan = parseLessonPlan(input.lessonPlan);
  const mzkRoute = parseMzkRoutePreference(input.mzkRoute);

  if (!hasConfiguredLessons(lessonPlan) && !hasConfiguredMzkRoute(mzkRoute)) {
    return {
      error: "Najpierw zapisz plan lekcji albo trasę MZK.",
    };
  }

  const matchWindowMin =
    input.matchWindowMin == null
      ? null
      : clampLessonMatchWindow(input.matchWindowMin);

  return {
    v: SETTINGS_TRANSFER_SCHEMA_VERSION,
    lessonPlan,
    mzkRoute,
    matchWindowMin,
    createdAt: new Date().toISOString(),
  };
}

export function parseSettingsTransferPayload(
  raw: unknown,
): SettingsTransferPayload | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "Nieprawidłowy pakiet ustawień." };
  }

  const record = raw as Record<string, unknown>;
  if (record.v !== SETTINGS_TRANSFER_SCHEMA_VERSION) {
    return { error: "Nieobsługiwana wersja pakietu ustawień." };
  }

  const lessonPlan = parseLessonPlan(record.lessonPlan);
  const mzkRoute = parseMzkRoutePreference(record.mzkRoute);

  if (!hasConfiguredLessons(lessonPlan) && !hasConfiguredMzkRoute(mzkRoute)) {
    return { error: "Pakiet nie zawiera planu lekcji ani trasy MZK." };
  }

  let matchWindowMin: number | null = null;
  if (record.matchWindowMin != null) {
    const n = Number(record.matchWindowMin);
    if (!Number.isFinite(n)) {
      return { error: "Nieprawidłowe okno dopasowania." };
    }
    matchWindowMin = clampLessonMatchWindow(n);
  }

  const createdAt =
    typeof record.createdAt === "string" && record.createdAt
      ? record.createdAt
      : new Date().toISOString();

  return {
    v: SETTINGS_TRANSFER_SCHEMA_VERSION,
    lessonPlan,
    mzkRoute,
    matchWindowMin,
    createdAt,
  };
}

export function summarizeTransferPayload(
  payload: SettingsTransferPayload,
  expiresInSec = SETTINGS_TRANSFER_TTL_SEC,
): SettingsTransferSummary {
  return {
    place: payload.lessonPlan.place,
    lessonDays: Object.keys(payload.lessonPlan.days).length,
    hasMzkRoute: hasConfiguredMzkRoute(payload.mzkRoute),
    matchWindowMin:
      payload.matchWindowMin ?? DEFAULT_LESSON_MATCH_WINDOW_MIN,
    expiresInSec: Math.max(0, Math.round(expiresInSec)),
  };
}
