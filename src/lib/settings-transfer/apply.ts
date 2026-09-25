import { saveLessonPlan } from "@/lib/child-schedule/storage";
import { saveLessonMatchWindow } from "@/lib/child-schedule/match-window";
import { savePreferredPlace } from "@/lib/child-schedule/preferred-place";
import { saveMzkRoutePreference } from "@/lib/mzk/route-storage";
import type { SettingsTransferPayload } from "./types";

/** Apply a redeemed transfer payload into localStorage (browser only). */
export function applySettingsTransferPayload(
  payload: SettingsTransferPayload,
): void {
  saveLessonPlan(payload.lessonPlan);
  saveMzkRoutePreference(payload.mzkRoute);

  if (payload.lessonPlan.place) {
    savePreferredPlace(payload.lessonPlan.place);
  }

  if (payload.matchWindowMin != null) {
    saveLessonMatchWindow(payload.matchWindowMin);
  }
}
