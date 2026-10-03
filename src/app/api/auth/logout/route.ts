import { NextResponse } from "next/server";
import { logoutSession } from "@/lib/auth/flow";
import { clearSessionCookie } from "@/lib/auth/http";
import { readRequestCookie } from "@/lib/auth/session-cookie";
import { openSessionId } from "@/lib/auth/token";

export const runtime = "nodejs";

/** End only this browser's session. Other devices stay logged in. */
export async function POST(request: Request) {
  const sealed = readRequestCookie(request.headers.get("cookie"));
  const sessionId = sealed ? openSessionId(sealed) : null;
  await logoutSession(sessionId);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
