import { getCurrentUser } from "@/lib/auth/current-user";
import { isUserId } from "@/lib/billing/constants";
import { isActiveUntil } from "@/lib/billing/school-year";
import { readEntitlement } from "@/lib/billing/store";

export const PUSH_LOGIN_REQUIRED = "Zaloguj się, żeby korzystać z powiadomień.";
export const PUSH_PLUS_REQUIRED = "Powiadomienia wymagają aktywnego Planu Plus.";
export const PUSH_NOT_YOURS = "Nie można zmienić tej subskrypcji.";

export type PushAccess =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: string };

export async function userHasActivePlus(userId: string, now = new Date()): Promise<boolean> {
  if (!isUserId(userId)) return false;
  const entitlement = await readEntitlement(userId);
  return entitlement?.status === "active" && isActiveUntil(entitlement.validUntil, now);
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

export async function requirePlusPush(now = new Date()): Promise<PushAccess> {
  const user = await requirePushUser();
  if (!user.ok) return user;
  if (!(await userHasActivePlus(user.userId, now))) {
    return { ok: false, status: 403, error: PUSH_PLUS_REQUIRED };
  }
  return user;
}
