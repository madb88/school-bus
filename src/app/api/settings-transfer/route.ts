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
  peekTransferPayload,
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

function readTokenFromRequest(request: Request): string {
  const { searchParams } = new URL(request.url);
  return normalizeTransferToken(
    searchParams.get("t") ?? searchParams.get("code") ?? "",
  );
}

async function requireTransferConfigured() {
  if (!isTransferStoreConfigured()) {
    return jsonError(
      "Transfer między urządzeniami nie jest skonfigurowany (brak Upstash Redis).",
      503,
    );
  }
  return null;
}

async function requireRedeemRateLimit(request: Request) {
  const ip = getClientIpFromHeaders(request.headers);
  const rate = await checkTransferRedeemRateLimit(ip);
  if (!rate.ok) {
    return jsonError(
      "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
      429,
      rate.retryAfterSec,
    );
  }
  return null;
}

/** Create a one-time transfer code (stored in Upstash Redis with TTL). */
export async function POST(request: Request) {
  const configured = await requireTransferConfigured();
  if (configured) return configured;

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
 * Preview a transfer code without consuming it.
 * Returns summary only — full payload is returned on DELETE (confirm).
 */
export async function GET(request: Request) {
  const configured = await requireTransferConfigured();
  if (configured) return configured;

  const limited = await requireRedeemRateLimit(request);
  if (limited) return limited;

  const token = readTokenFromRequest(request);
  if (!isValidTransferToken(token)) {
    return jsonError("Podaj prawidłowy kod transferu.", 400);
  }

  const peeked = await peekTransferPayload(token);
  if (!peeked.ok) {
    return jsonError(peeked.error, peeked.status);
  }

  const parsed = parseSettingsTransferPayload(peeked.payload);
  if ("error" in parsed) {
    return jsonError(parsed.error, 400);
  }

  return NextResponse.json({
    summary: summarizeTransferPayload(parsed, peeked.ttlSec),
    expiresInSec: peeked.ttlSec,
  });
}

/**
 * Consume a transfer code and return the full payload for local apply.
 */
export async function DELETE(request: Request) {
  const configured = await requireTransferConfigured();
  if (configured) return configured;

  const limited = await requireRedeemRateLimit(request);
  if (limited) return limited;

  const token = readTokenFromRequest(request);
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
