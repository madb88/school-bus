import { cookies } from "next/headers";
import { cache } from "react";
import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import { fetchMe, type BackendRole } from "./backend";
import { SESSION_COOKIE } from "./constants";
import { readSessionToken } from "./token";

export type CurrentUser = {
  userId: string;
  email: string;
  role: BackendRole;
  plans: AccountPlan[];
  createdAt: string;
  sessionToken: string;
};

let warnedUnavailable = false;

async function loadCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!token) return null;

  const user = await fetchMe(token);
  if (user === "unavailable") {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn("Auth backend unavailable; treating as logged out");
    }
    return null;
  }
  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    plans: user.plans,
    createdAt: user.createdAt,
    sessionToken: token,
  };
}

/** Per-request memoization so SiteHeader and page gates share one /users/me call. */
export const getCurrentUser = cache(loadCurrentUser);

/** Reset the one-shot unavailable warning (tests only). */
export function resetCurrentUserWarnCache(): void {
  warnedUnavailable = false;
}
