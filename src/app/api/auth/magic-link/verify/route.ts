import { NextResponse } from "next/server";
import { loginWithMagicCode, loginWithMagicToken } from "@/lib/auth/flow";
import { applySessionCookie, jsonError } from "@/lib/auth/http";
import { getClientIpFromHeaders } from "@/lib/auth/rate-limit";
import { readRequestCookie } from "@/lib/auth/session-cookie";
import { destroySession } from "@/lib/auth/store";
import { openSessionId } from "@/lib/auth/token";

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

async function retirePreviousSession(request: Request, nextSessionId: string) {
  const sealed = readRequestCookie(request.headers.get("cookie"));
  if (!sealed) return;
  const previous = openSessionId(sealed);
  if (!previous || previous === nextSessionId) return;
  await destroySession(previous);
}

/** Consume a magic link from email and start a session in this browser. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await loginWithMagicToken(token);
  if (!result.ok) {
    return accountRedirect(
      request,
      "/login",
      result.reason === "unavailable" ? "unavailable" : "invalid",
    );
  }

  await retirePreviousSession(request, result.sessionId);
  const response = accountRedirect(request, "/profil");
  if (!applySessionCookie(response, result.sessionId)) {
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

  const result = await loginWithMagicCode({
    rawEmail,
    rawCode,
    ip: getClientIpFromHeaders(request.headers),
  });

  if (!result.ok) {
    return jsonError(result.error, result.status, result.retryAfterSec);
  }

  await retirePreviousSession(request, result.sessionId);
  const response = NextResponse.json({ ok: true });
  if (!applySessionCookie(response, result.sessionId)) {
    return jsonError("Logowanie e-mailem nie jest teraz dostępne. Spróbuj później.", 503);
  }
  return response;
}
