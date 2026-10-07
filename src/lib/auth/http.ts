import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SEC } from "./constants";
import { sessionCookieOptions } from "./session-cookie";
import { readSessionToken } from "./token";

export function jsonError(message: string, status: number, retryAfterSec?: number) {
  const headers =
    retryAfterSec != null ? { "Retry-After": String(retryAfterSec) } : undefined;
  return NextResponse.json({ error: message }, { status, headers });
}

function maxAgeFromExpiresAt(expiresAt?: string): number {
  if (!expiresAt) return SESSION_TTL_SEC;
  const ms = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return SESSION_TTL_SEC;
  return Math.min(SESSION_TTL_SEC, Math.max(1, Math.floor(ms / 1000)));
}

export function applySessionCookie(
  response: NextResponse,
  sessionToken: string,
  expiresAt?: string,
): boolean {
  if (!readSessionToken(sessionToken)) return false;
  response.cookies.set(
    SESSION_COOKIE,
    sessionToken,
    sessionCookieOptions(maxAgeFromExpiresAt(expiresAt)),
  );
  return true;
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}
