import { NextResponse } from "next/server";
import { logout } from "@/lib/auth/backend";
import { clearSessionCookie } from "@/lib/auth/http";
import { readRequestCookie } from "@/lib/auth/session-cookie";
import { readSessionToken } from "@/lib/auth/token";

export const runtime = "nodejs";

/** End only this browser's session. Other devices stay logged in. */
export async function POST(request: Request) {
  const token = readSessionToken(readRequestCookie(request.headers.get("cookie")));
  if (token) {
    try {
      await logout(token);
    } catch {
      // Always clear the local cookie even if the backend is unreachable.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
