/** Shown on the profile. The charged amount is the Stripe Price, not this label. */
export const PLUS_PRICE_LABEL = "30 zł";

/** Matches backend `BILLING__TRIAL_WEEKS` default — used for copy when plans are hidden. */
export const TRIAL_WEEKS = 2;

export const MAX_ACCOUNT_PLANS = 5;

export const COMPLAINT_USER_MAX = 3;
export const COMPLAINT_WINDOW = "15 m";
export const COMPLAINT_WINDOW_MS = 15 * 60 * 1000;

const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUserId(value: string): boolean {
  return USER_ID_RE.test(value);
}
