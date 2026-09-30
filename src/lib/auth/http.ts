import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "./constants";
import { sessionCookieOptions } from "./session-cookie";
import { sealSessionId } from "./token";

export function jsonError(message: string, status: number, retryAfterSec?: number) {
  const headers =
    retryAfterSec != null ? { "Retry-After": String(retryAfterSec) } : undefined;
  return NextResponse.json({ error: message }, { status, headers });
}

export function applySessionCookie(response: NextResponse, sessionId: string): boolean {
  const sealed = sealSessionId(sessionId);
  if (!sealed) return false;
  response.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions());
  return true;
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}
