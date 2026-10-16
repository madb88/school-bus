import { fetchPlus, fetchPlusForUser } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPushPlusAccess } from "@/lib/billing/access";
import { isUserId } from "@/lib/billing/constants";

export const PUSH_LOGIN_REQUIRED = "Zaloguj się, żeby korzystać z powiadomień.";
export const PUSH_PLUS_REQUIRED = "Powiadomienia wymagają aktywnego Planu Plus.";
export const PUSH_NOT_YOURS = "Nie można zmienić tej subskrypcji.";

export type PushAccess =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

/** Session-scoped check for interactive push routes (active + admin; not trial yet). */
export async function userHasActivePlus(
  sessionToken: string,
  role: "admin" | "school" | "individual",
): Promise<boolean> {
  const status = await fetchPlus(sessionToken);
  return hasPushPlusAccess(role, status);
}

/**
 * User-id check for QStash dispatch (no browser session). Fail closed when the
 * backend is unavailable so we do not notify after a refund.
 * Still entitlement-only (`active`) until a service access endpoint exists.
 */
export async function userIdHasActivePlus(userId: string): Promise<boolean> {
  if (!isUserId(userId)) return false;
  const status = await fetchPlusForUser(userId);
  return status !== "unavailable" && status.state === "active";
}

/** A subscription with no account yet can be claimed. Another account cannot. */
export function pushOwnedBy(recordUserId: string | undefined, sessionUserId: string): boolean {
  if (!recordUserId) return true;
  return recordUserId === sessionUserId;
}

export async function requirePushUser(): Promise<PushAccess> {
  const user = await getCurrentUser();
  if (!user || !isUserId(user.userId)) {
    return { ok: false, status: 401, error: PUSH_LOGIN_REQUIRED };
  }
  return { ok: true, userId: user.userId };
}

export async function requirePlusPush(): Promise<PushAccess> {
  const user = await getCurrentUser();
  if (!user || !isUserId(user.userId)) {
    return { ok: false, status: 401, error: PUSH_LOGIN_REQUIRED };
  }
  if (!(await userHasActivePlus(user.sessionToken, user.role))) {
    return { ok: false, status: 403, error: PUSH_PLUS_REQUIRED };
  }
  return { ok: true, userId: user.userId };
}
