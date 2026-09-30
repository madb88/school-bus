import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";
import { getUserForSession } from "./store";
import { openSessionId } from "./token";

async function readSessionId(): Promise<string | null> {
  const jar = await cookies();
  const sealed = jar.get(SESSION_COOKIE)?.value;
  if (!sealed) return null;
  return openSessionId(sealed);
}

/** Signed cookie only — used by the header link, without a Redis lookup. */
export async function hasSignedInSession(): Promise<boolean> {
  return (await readSessionId()) !== null;
}

export async function getCurrentUser(): Promise<{ userId: string; email: string } | null> {
  const sessionId = await readSessionId();
  if (!sessionId) return null;
  return getUserForSession(sessionId);
}
