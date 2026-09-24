import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import type { MzkRoutePreference } from "@/lib/mzk/route-preference";

export const SETTINGS_TRANSFER_SCHEMA_VERSION = 1 as const;

export const SETTINGS_TRANSFER_TTL_SEC = 15 * 60;

export const SETTINGS_TRANSFER_PATH = "/przywroc";

export type SettingsTransferPayload = {
  v: typeof SETTINGS_TRANSFER_SCHEMA_VERSION;
  lessonPlan: ChildLessonPlan;
  mzkRoute: MzkRoutePreference;
  matchWindowMin: number | null;
  createdAt: string;
};

export type SettingsTransferSummary = {
  place: string | null;
  lessonDays: number;
  hasMzkRoute: boolean;
  matchWindowMin: number | null;
  expiresInSec: number;
};
