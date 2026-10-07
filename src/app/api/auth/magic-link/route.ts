import { NextResponse } from "next/server";
import { requestMagicLink } from "@/lib/auth/backend";
import { jsonError } from "@/lib/auth/http";
import { getClientIpFromHeaders } from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

/** Send a one-time login link and code. The response does not reveal whether the mailbox exists. */
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

  const result = await requestMagicLink(
    rawEmail,
    getClientIpFromHeaders(request.headers),
  );

  if (!result.ok) {
    return jsonError(result.error, result.status, result.retryAfterSec);
  }

  return NextResponse.json({ ok: true });
}
