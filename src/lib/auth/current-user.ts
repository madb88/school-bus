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

/** Resolved auth for UI gates — distinguishes backend blips from true logout. */
export type AuthSession =
  | { status: "anonymous" }
  | { status: "unavailable" }
  | { status: "authenticated"; user: CurrentUser };

let warnedUnavailable = false;

async function loadAuthSession(): Promise<AuthSession> {
  const jar = await cookies();
  const token = readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!token) return { status: "anonymous" };

  const user = await fetchMe(token);
  if (user === "unavailable") {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn(
        "Auth backend unavailable; keeping session cookie, not treating as logged out",
      );
    }
    return { status: "unavailable" };
  }
  if (!user) return { status: "anonymous" };

  return {
    status: "authenticated",
    user: {
      userId: user.id,
      email: user.email,
      role: user.role,
      plans: user.plans,
      createdAt: user.createdAt,
      sessionToken: token,
    },
  };
}

/** Per-request memoization so SiteHeader and page gates share one /users/me call. */
export const getAuthSession = cache(loadAuthSession);

/** Authenticated user only; `null` for anonymous and unavailable (API/action gates). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getAuthSession();
  return session.status === "authenticated" ? session.user : null;
}

/** Reset the one-shot unavailable warning (tests only). */
export function resetCurrentUserWarnCache(): void {
  warnedUnavailable = false;
}
