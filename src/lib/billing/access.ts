import type { PlusStatus } from "@/lib/auth/backend";
import type { PlusPanelState } from "./status";
import { TRIAL_WEEKS } from "./constants";

export type UserRole = "admin" | "school" | "individual";

/**
 * Mirrors backend `has_plus_access`: admin always, otherwise active or trial.
 * `pending` alone is not access — prefer `user.plans` / PATCH when unsure.
 */
export function hasPlusAccess(
  role: UserRole,
  plus: PlusStatus | "unavailable",
): boolean {
  if (role === "admin") return true;
  if (plus === "unavailable") return false;
  return plus.state === "active" || plus.state === "trial";
}

/**
 * Push subscribe/dispatch gate until the backend exposes plusAccess by user id
 * for QStash (trial users would otherwise be dropped on the next dispatch).
 */
export function hasPushPlusAccess(
  role: UserRole,
  plus: PlusStatus | "unavailable",
): boolean {
  if (role === "admin") return true;
  if (plus === "unavailable") return false;
  return plus.state === "active";
}

/** Panel-state variant for client components that only have PlusPanelState. */
export function hasPlusAccessFromPanel(
  role: UserRole,
  plus: PlusPanelState,
): boolean {
  if (role === "admin") return true;
  return plus.state === "active" || plus.state === "trial";
}

export function hasPushPlusAccessFromPanel(
  role: UserRole,
  plus: PlusPanelState,
): boolean {
  if (role === "admin") return true;
  return plus.state === "active";
}

/** True when the account is older than the default trial window. */
export function isPastTrialWindow(
  createdAt: string,
  now: Date = new Date(),
): boolean {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created > TRIAL_WEEKS * 7 * 86_400_000;
}
