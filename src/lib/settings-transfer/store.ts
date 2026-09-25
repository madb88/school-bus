import { Redis } from "@upstash/redis";
import {
  decryptTransferBlob,
  encryptTransferBlob,
  isTransferEncryptionConfigured,
} from "./crypto";
import {
  SETTINGS_TRANSFER_TTL_SEC,
  type SettingsTransferPayload,
} from "./types";

const KEY_PREFIX = "school-bus:transfer:";

let redisClient: Redis | null | undefined;

export function getTransferRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

/** Redis + encryption secret are both required for device transfer. */
export function isTransferStoreConfigured(): boolean {
  return getTransferRedis() !== null && isTransferEncryptionConfigured();
}

function missingConfigError(): string {
  if (getTransferRedis() === null) {
    return "Transfer wymaga skonfigurowanego Upstash Redis.";
  }
  return "Transfer wymaga SETTINGS_TRANSFER_SECRET (szyfrowanie w Redis).";
}

function keyFor(token: string): string {
  return `${KEY_PREFIX}${token}`;
}

function decodeBlob(
  raw: unknown,
): { ok: true; payload: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, payload: decryptTransferBlob(raw) };
  } catch (error) {
    console.error("Failed to decrypt settings transfer blob", error);
    return { ok: false, error: "Nie udało się odszyfrować ustawień." };
  }
}

export async function saveTransferPayload(
  token: string,
  payload: SettingsTransferPayload,
): Promise<{ ok: true; ttlSec: number } | { ok: false; error: string }> {
  const redis = getTransferRedis();
  if (!redis || !isTransferEncryptionConfigured()) {
    return { ok: false, error: missingConfigError() };
  }

  try {
    const blob = encryptTransferBlob(payload);
    await redis.set(keyFor(token), blob, { ex: SETTINGS_TRANSFER_TTL_SEC });
    return { ok: true, ttlSec: SETTINGS_TRANSFER_TTL_SEC };
  } catch (error) {
    console.error("Failed to save settings transfer", error);
    return { ok: false, error: "Nie udało się zapisać kodu transferu." };
  }
}

/**
 * Read a transfer payload without consuming it (preview).
 */
export async function peekTransferPayload(
  token: string,
): Promise<
  | { ok: true; payload: unknown; ttlSec: number }
  | { ok: false; error: string; status: 404 | 503 }
> {
  const redis = getTransferRedis();
  if (!redis || !isTransferEncryptionConfigured()) {
    return {
      ok: false,
      error: missingConfigError(),
      status: 503,
    };
  }

  const key = keyFor(token);

  try {
    const [raw, ttlSec] = await Promise.all([
      redis.get<unknown>(key),
      redis.ttl(key),
    ]);

    if (raw == null) {
      return {
        ok: false,
        error: "Kod wygasł albo został już użyty.",
        status: 404,
      };
    }

    const decoded = decodeBlob(raw);
    if (!decoded.ok) {
      return { ok: false, error: decoded.error, status: 503 };
    }

    return {
      ok: true,
      payload: decoded.payload,
      ttlSec: typeof ttlSec === "number" && ttlSec > 0 ? ttlSec : 0,
    };
  } catch (error) {
    console.error("Failed to peek settings transfer", error);
    return {
      ok: false,
      error: "Nie udało się odczytać kodu transferu.",
      status: 503,
    };
  }
}

/**
 * Atomically read and delete a one-time transfer payload (confirm apply).
 */
export async function takeTransferPayload(
  token: string,
): Promise<
  | { ok: true; payload: unknown }
  | { ok: false; error: string; status: 404 | 503 }
> {
  const redis = getTransferRedis();
  if (!redis || !isTransferEncryptionConfigured()) {
    return {
      ok: false,
      error: missingConfigError(),
      status: 503,
    };
  }

  try {
    const raw = await redis.getdel<unknown>(keyFor(token));

    if (raw == null) {
      return {
        ok: false,
        error: "Kod wygasł albo został już użyty.",
        status: 404,
      };
    }

    const decoded = decodeBlob(raw);
    if (!decoded.ok) {
      return { ok: false, error: decoded.error, status: 503 };
    }

    return { ok: true, payload: decoded.payload };
  } catch (error) {
    console.error("Failed to take settings transfer", error);
    return {
      ok: false,
      error: "Nie udało się odczytać kodu transferu.",
      status: 503,
    };
  }
}
