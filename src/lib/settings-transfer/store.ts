import { Redis } from "@upstash/redis";
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

export function isTransferStoreConfigured(): boolean {
  return getTransferRedis() !== null;
}

function keyFor(token: string): string {
  return `${KEY_PREFIX}${token}`;
}

export async function saveTransferPayload(
  token: string,
  payload: SettingsTransferPayload,
): Promise<{ ok: true; ttlSec: number } | { ok: false; error: string }> {
  const redis = getTransferRedis();
  if (!redis) {
    return {
      ok: false,
      error: "Transfer wymaga skonfigurowanego Upstash Redis.",
    };
  }

  try {
    await redis.set(keyFor(token), payload, { ex: SETTINGS_TRANSFER_TTL_SEC });
    return { ok: true, ttlSec: SETTINGS_TRANSFER_TTL_SEC };
  } catch (error) {
    console.error("Failed to save settings transfer", error);
    return { ok: false, error: "Nie udało się zapisać kodu transferu." };
  }
}

/**
 * Atomically read and delete a one-time transfer payload.
 * Returns null when missing/expired.
 */
export async function takeTransferPayload(
  token: string,
): Promise<
  | { ok: true; payload: unknown }
  | { ok: false; error: string; status: 404 | 503 }
> {
  const redis = getTransferRedis();
  if (!redis) {
    return {
      ok: false,
      error: "Transfer wymaga skonfigurowanego Upstash Redis.",
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

    return { ok: true, payload: raw };
  } catch (error) {
    console.error("Failed to take settings transfer", error);
    return {
      ok: false,
      error: "Nie udało się odczytać kodu transferu.",
      status: 503,
    };
  }
}
