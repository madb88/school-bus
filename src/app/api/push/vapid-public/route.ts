import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/http";
import {
  normalizeVapidPublicKey,
  parseApplicationServerKey,
} from "@/lib/push/vapid-key";

export const runtime = "nodejs";

/**
 * Public VAPID key for PushManager.subscribe.
 * Served at runtime so Railway/Docker env works without relying on
 * NEXT_PUBLIC_* build-time inlining alone.
 */
export async function GET() {
  const raw =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    "";
  if (!raw) {
    return jsonError("Powiadomienia nie są jeszcze skonfigurowane.", 503);
  }

  const publicKey = normalizeVapidPublicKey(raw);
  if (!parseApplicationServerKey(publicKey)) {
    return jsonError(
      "Klucz VAPID na serwerze jest niepoprawny (oczekiwany publiczny P-256).",
      503,
    );
  }

  return NextResponse.json(
    { publicKey },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
