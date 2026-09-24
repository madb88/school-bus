import { NextResponse } from "next/server";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import type { MzkRoutePreference } from "@/lib/mzk/route-preference";
import {
  buildSettingsTransferPayload,
  parseSettingsTransferPayload,
  summarizeTransferPayload,
} from "@/lib/settings-transfer/payload";
import {
  checkTransferCreateRateLimit,
  checkTransferRedeemRateLimit,
  getClientIpFromHeaders,
} from "@/lib/settings-transfer/rate-limit";
import {
  isTransferStoreConfigured,
  saveTransferPayload,
  takeTransferPayload,
} from "@/lib/settings-transfer/store";
import {
  formatTransferCode,
  generateTransferToken,
  isValidTransferToken,
  normalizeTransferToken,
} from "@/lib/settings-transfer/token";
import { SETTINGS_TRANSFER_PATH } from "@/lib/settings-transfer/types";

export const runtime = "nodejs";

function jsonError(message: string, status: number, retryAfterSec?: number) {
  const headers =
    retryAfterSec != null
      ? { "Retry-After": String(retryAfterSec) }
      : undefined;
  return NextResponse.json({ error: message }, { status, headers });
}

/** Create a one-time transfer code (stored in Upstash Redis with TTL). */
export async function POST(request: Request) {
  if (!isTransferStoreConfigured()) {
    return jsonError(
      "Transfer między urządzeniami nie jest skonfigurowany (brak Upstash Redis).",
      503,
    );
  }

  const ip = getClientIpFromHeaders(request.headers);
  const rate = await checkTransferCreateRateLimit(ip);
  if (!rate.ok) {
    return jsonError(
      "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
      429,
      rate.retryAfterSec,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Nieprawidłowe body JSON.", 400);
  }

  if (!body || typeof body !== "object") {
    return jsonError("Nieprawidłowe body.", 400);
  }

  const record = body as {
    lessonPlan?: ChildLessonPlan;
    mzkRoute?: MzkRoutePreference;
    matchWindowMin?: number | null;
  };

  const built = buildSettingsTransferPayload({
    lessonPlan: record.lessonPlan ?? { place: null, days: {} },
    mzkRoute: record.mzkRoute ?? {
      boardStopId: null,
      alightStopId: null,
      route: null,
    },
    matchWindowMin: record.matchWindowMin,
  });

  if ("error" in built) {
    return jsonError(built.error, 400);
  }

  const token = generateTransferToken(8);
  const saved = await saveTransferPayload(token, built);
  if (!saved.ok) {
    return jsonError(saved.error, 503);
  }

  const origin = new URL(request.url).origin;
  const path = `${SETTINGS_TRANSFER_PATH}?t=${token}`;

  return NextResponse.json({
    token,
    code: formatTransferCode(token),
    path,
    url: `${origin}${path}`,
    expiresInSec: saved.ttlSec,
    summary: summarizeTransferPayload(built, saved.ttlSec),
  });
}

/**
 * Redeem a one-time transfer code.
 * Consumes the Redis entry (getdel) — canceling after this requires a new QR.
 */
export async function GET(request: Request) {
  if (!isTransferStoreConfigured()) {
    return jsonError(
      "Transfer między urządzeniami nie jest skonfigurowany (brak Upstash Redis).",
      503,
    );
  }

  const ip = getClientIpFromHeaders(request.headers);
  const rate = await checkTransferRedeemRateLimit(ip);
  if (!rate.ok) {
    return jsonError(
      "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
      429,
      rate.retryAfterSec,
    );
  }

  const { searchParams } = new URL(request.url);
  const rawToken = searchParams.get("t") ?? searchParams.get("code") ?? "";
  const token = normalizeTransferToken(rawToken);

  if (!isValidTransferToken(token)) {
    return jsonError("Podaj prawidłowy kod transferu.", 400);
  }

  const taken = await takeTransferPayload(token);
  if (!taken.ok) {
    return jsonError(taken.error, taken.status);
  }

  const parsed = parseSettingsTransferPayload(taken.payload);
  if ("error" in parsed) {
    return jsonError(parsed.error, 400);
  }

  return NextResponse.json({
    payload: parsed,
    summary: summarizeTransferPayload(parsed),
  });
}
