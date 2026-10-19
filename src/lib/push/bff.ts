import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/auth/backend";
import { jsonError } from "@/lib/auth/http";
import { getClientIpFromHeaders } from "@/lib/auth/rate-limit";
import { readRequestCookie } from "@/lib/auth/session-cookie";
import { readSessionToken } from "@/lib/auth/token";

function sessionFromRequest(request: Request): {
  sessionToken: string | undefined;
  clientIp: string;
} {
  const sessionToken =
    readSessionToken(readRequestCookie(request.headers.get("cookie"))) ??
    undefined;
  const clientIp = getClientIpFromHeaders(request.headers);
  return { sessionToken, clientIp };
}

/**
 * Thin BFF: forward `/api/push/*` to the backend push API.
 * Identity, Plus gate, validation and rate limits live on the backend.
 */
export async function proxyPush(
  request: Request,
  path: string,
  method: string,
): Promise<NextResponse> {
  const { sessionToken, clientIp } = sessionFromRequest(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Niepoprawne żądanie.", 400);
  }

  const result = await backendFetch(path, {
    method,
    body,
    sessionToken,
    clientIp,
  });

  if (!result.ok) {
    return jsonError(result.error, result.status, result.retryAfterSec);
  }

  return NextResponse.json(result.data ?? { ok: true }, {
    status: result.status,
  });
}

/** GET proxy (no JSON body) — e.g. list devices by user. */
export async function proxyPushGet(
  request: Request,
  path: string,
): Promise<NextResponse> {
  const { sessionToken, clientIp } = sessionFromRequest(request);

  const result = await backendFetch(path, {
    method: "GET",
    sessionToken,
    clientIp,
  });

  if (!result.ok) {
    return jsonError(result.error, result.status, result.retryAfterSec);
  }

  return NextResponse.json(result.data ?? [], {
    status: result.status,
  });
}
