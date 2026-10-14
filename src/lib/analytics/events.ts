import posthog from "posthog-js";

/** Named product events — prefer these over raw strings at call sites. */
export const AnalyticsEvent = {
  scheduleSourceModeChanged: "schedule_source_mode_changed",
  schedulePrintClicked: "schedule_print_clicked",
  scheduleShareCopied: "schedule_share_copied",
  lessonPlanSaved: "lesson_plan_saved",
  lessonPlanPrintClicked: "lesson_plan_print_clicked",
  mzkRouteSaved: "mzk_route_saved",
  feedbackOpened: "feedback_opened",
  feedbackSubmitted: "feedback_submitted",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/**
 * Fire a named PostHog event from client code.
 * No-op when PostHog is not configured or not yet initialized.
 */
export function trackEvent(
  event: AnalyticsEventName,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return;
  posthog.capture(event, properties);
}
