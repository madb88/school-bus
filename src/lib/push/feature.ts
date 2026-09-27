/** Temporary gate for the PWA push settings UI on /instalacja. */
export function isPushNotificationsUiEnabled(): boolean {
  return process.env.PUSH_NOTIFICATIONS_UI_ENABLED === "true";
}
