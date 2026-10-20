import { NextResponse } from "next/server";
import { jsonError } from "@/lib/auth/http";
import {
  normalizeVapidPublicKey,
  parseApplicationServerKey,
  urlBase64ToUint8Array,
} from "@/lib/push/vapid-key";

export const runtime = "nodejs";

/**
 * Prefer a non-NEXT_PUBLIC name so Next does not inline the value at build
 * time (Railway often injects secrets only at runtime).
 */
function readServerVapidPublicKey(): string {
  // Dynamic lookup — avoids build-time replacement of NEXT_PUBLIC_* literals.
  const env = process.env;
  return (
    env.VAPID_PUBLIC_KEY?.trim() ||
    env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"]?.trim() ||
    ""
  );
}

function keyDiagnostics(raw: string): {
  byteLength: number | null;
  leadingByte: number | null;
} {
  try {
    const key = urlBase64ToUint8Array(normalizeVapidPublicKey(raw));
    return { byteLength: key.byteLength, leadingByte: key[0] ?? null };
  } catch {
    return { byteLength: null, leadingByte: null };
  }
}

/**
 * Public VAPID key for PushManager.subscribe.
 * Served at runtime so Railway env works without NEXT_PUBLIC_ build inlining.
 */
export async function GET() {
  const raw = readServerVapidPublicKey();
  if (!raw) {
    return jsonError(
      "Brak VAPID_PUBLIC_KEY (albo NEXT_PUBLIC_VAPID_PUBLIC_KEY) w Variables serwisu Next.",
      503,
    );
  }

  const publicKey = normalizeVapidPublicKey(raw);
  if (!parseApplicationServerKey(publicKey)) {
    const { byteLength, leadingByte } = keyDiagnostics(raw);
    return NextResponse.json(
      {
        error:
          "Klucz VAPID na serwerze jest niepoprawny (oczekiwany publiczny P-256: 65 bajtów, prefix 0x04). Ustaw VAPID_PUBLIC_KEY = publiczny klucz z pary (nie private).",
        byteLength,
        leadingByte,
      },
      { status: 503 },
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
