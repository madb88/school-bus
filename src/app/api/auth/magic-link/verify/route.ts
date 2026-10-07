import { NextResponse } from "next/server";
import { verifyCode, verifyLink } from "@/lib/auth/backend";
import { AUTH_UNAVAILABLE } from "@/lib/auth/messages";
import { applySessionCookie, jsonError } from "@/lib/auth/http";
import { getClientIpFromHeaders } from "@/lib/auth/rate-limit";
import { readRequestCookie } from "@/lib/auth/session-cookie";
import { readSessionToken } from "@/lib/auth/token";

export const runtime = "nodejs";

function accountRedirect(
  request: Request,
  path: "/login" | "/profil",
  login?: "invalid" | "unavailable",
) {
  const url = new URL(path, request.url);
  if (login) url.searchParams.set("login", login);
  return NextResponse.redirect(url, 303);
}

function previousSessionToken(request: Request): string | null {
  return readSessionToken(readRequestCookie(request.headers.get("cookie")));
}

/** Consume a magic link from email and start a session in this browser. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await verifyLink(token, previousSessionToken(request));
  if (!result.ok) {
    return accountRedirect(
      request,
      "/login",
      result.status === 400 ? "invalid" : "unavailable",
    );
  }

  const response = accountRedirect(request, "/profil");
  if (!applySessionCookie(response, result.data.sessionToken, result.data.expiresAt)) {
    return accountRedirect(request, "/login", "unavailable");
  }
  return response;
}

/** Consume the 6-digit code (PWA / a browser that did not open the link). */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rawEmail = typeof record.email === "string" ? record.email : "";
  const rawCode = typeof record.code === "string" ? record.code : "";

  const result = await verifyCode(
    rawEmail,
    rawCode,
    getClientIpFromHeaders(request.headers),
    previousSessionToken(request),
  );

  if (!result.ok) {
    return jsonError(result.error, result.status, result.retryAfterSec);
  }

  const response = NextResponse.json({ ok: true });
  if (!applySessionCookie(response, result.data.sessionToken, result.data.expiresAt)) {
    return jsonError(AUTH_UNAVAILABLE, 503);
  }
  return response;
}
