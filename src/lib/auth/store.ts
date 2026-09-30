import { randomUUID } from "node:crypto";
import type { Redis } from "@upstash/redis";
import {
  CODE_MAX_ATTEMPTS,
  MAGIC_TTL_SEC,
  SESSION_TTL_SEC,
  USERS_INDEX_KEY,
  magicAttemptsKey,
  magicEmailKey,
  magicKey,
  sessionKey,
  userEmailKey,
  userKey,
} from "./constants";
import { normalizeEmail } from "./email";
import { getAuthRedis } from "./redis";
import {
  authSecret,
  generateLoginCode,
  generateSecretId,
  hashLoginCode,
  isSecretId,
  loginCodesMatch,
  normalizeLoginCode,
} from "./token";

/** Commands this module uses. Upstash Redis implements them. */
export type AuthKv = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(
    key: string,
    value: unknown,
    opts?: { ex: number } | { nx: true },
  ): Promise<unknown>;
  getdel<T = unknown>(key: string): Promise<T | null>;
  del(...keys: string[]): Promise<unknown>;
  sadd(key: string, member: string): Promise<unknown>;
  expire(key: string, seconds: number): Promise<unknown>;
  incr(key: string): Promise<number>;
};

type UserRecord = {
  email: string;
  createdAt: string;
};

type MagicRecord = {
  email: string;
  codeHash: string;
};

type SessionRecord = {
  userId: string;
};

export type AuthFailure = { ok: false; reason: "invalid" | "unavailable" };

function kvFrom(client?: AuthKv): AuthKv | null {
  if (client) return client;
  const redis = getAuthRedis();
  if (!redis) return null;
  return toAuthKv(redis);
}

export function toAuthKv(redis: Redis): AuthKv {
  return {
    get: (key) => redis.get(key),
    set: (key, value, opts) => {
      if (opts && "nx" in opts) return redis.set(key, value, { nx: true });
      if (opts && "ex" in opts) return redis.set(key, value, { ex: opts.ex });
      return redis.set(key, value);
    },
    getdel: (key) => redis.getdel(key),
    del: (...keys) => redis.del(...keys),
    sadd: (key, member) => redis.sadd(key, member),
    expire: (key, seconds) => redis.expire(key, seconds),
    incr: (key) => redis.incr(key),
  };
}

function parseUser(value: unknown): UserRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.email !== "string" || typeof record.createdAt !== "string") {
    return null;
  }
  return { email: record.email, createdAt: record.createdAt };
}

function parseMagic(value: unknown): MagicRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.email !== "string" || typeof record.codeHash !== "string") {
    return null;
  }
  return { email: record.email, codeHash: record.codeHash };
}

function parseSession(value: unknown): SessionRecord | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.userId !== "string" || !record.userId) return null;
  return { userId: record.userId };
}

async function burnMagic(redis: AuthKv, token: string, email: string): Promise<void> {
  const pointer = magicEmailKey(email);
  const current = await redis.get<string>(pointer);
  if (current === token) {
    await redis.del(pointer);
  }
  await redis.del(magicKey(token), magicAttemptsKey(token));
}

async function takeMagic(redis: AuthKv, token: string): Promise<MagicRecord | null> {
  const record = parseMagic(await redis.getdel<unknown>(magicKey(token)));
  if (!record) return null;
  await burnMagic(redis, token, record.email);
  return record;
}

export async function createMagicChallenge(
  rawEmail: string,
  client?: AuthKv,
): Promise<{ ok: true; email: string; token: string; code: string } | AuthFailure> {
  const redis = kvFrom(client);
  const email = normalizeEmail(rawEmail);
  if (!redis || !authSecret()) return { ok: false, reason: "unavailable" };
  if (!email) return { ok: false, reason: "invalid" };

  const code = generateLoginCode();
  const codeHash = hashLoginCode(code);
  const token = generateSecretId();
  if (!codeHash || !isSecretId(token)) return { ok: false, reason: "unavailable" };

  try {
    const previous = await redis.get<string>(magicEmailKey(email));
    if (typeof previous === "string" && isSecretId(previous)) {
      await redis.del(magicKey(previous), magicAttemptsKey(previous));
    }

    await redis.set(magicKey(token), { email, codeHash }, { ex: MAGIC_TTL_SEC });
    const pointed = await redis.set(magicEmailKey(email), token, { ex: MAGIC_TTL_SEC });
    if (pointed !== "OK") {
      await redis.del(magicKey(token));
      return { ok: false, reason: "unavailable" };
    }

    return { ok: true, email, token, code };
  } catch {
    console.error("Auth magic challenge failed");
    return { ok: false, reason: "unavailable" };
  }
}

export async function discardMagicChallenge(
  token: string,
  email: string,
  client?: AuthKv,
): Promise<void> {
  const redis = kvFrom(client);
  if (!redis || !isSecretId(token)) return;
  try {
    await burnMagic(redis, token, email);
  } catch {
    console.error("Auth discard magic failed");
  }
}

export async function consumeMagicToken(
  token: string,
  client?: AuthKv,
): Promise<{ ok: true; email: string } | AuthFailure> {
  const redis = kvFrom(client);
  if (!redis || !authSecret()) return { ok: false, reason: "unavailable" };
  if (!isSecretId(token)) return { ok: false, reason: "invalid" };

  try {
    const record = await takeMagic(redis, token);
    if (!record) return { ok: false, reason: "invalid" };
    return { ok: true, email: record.email };
  } catch {
    console.error("Auth magic token failed");
    return { ok: false, reason: "unavailable" };
  }
}

export async function consumeMagicCode(
  rawEmail: string,
  rawCode: string,
  client?: AuthKv,
): Promise<{ ok: true; email: string } | AuthFailure> {
  const redis = kvFrom(client);
  const email = normalizeEmail(rawEmail);
  const code = normalizeLoginCode(rawCode);
  if (!redis || !authSecret()) return { ok: false, reason: "unavailable" };
  if (!email || !code) return { ok: false, reason: "invalid" };

  try {
    const token = await redis.get<string>(magicEmailKey(email));
    if (typeof token !== "string" || !isSecretId(token)) {
      return { ok: false, reason: "invalid" };
    }

    const attempts = Number(await redis.incr(magicAttemptsKey(token)));
    if (!Number.isFinite(attempts)) return { ok: false, reason: "unavailable" };
    if (attempts === 1) {
      await redis.expire(magicAttemptsKey(token), MAGIC_TTL_SEC);
    }
    if (attempts > CODE_MAX_ATTEMPTS) {
      await burnMagic(redis, token, email);
      return { ok: false, reason: "invalid" };
    }

    const record = parseMagic(await redis.get<unknown>(magicKey(token)));
    if (!record) {
      await redis.del(magicEmailKey(email), magicAttemptsKey(token));
      return { ok: false, reason: "invalid" };
    }
    if (record.email !== email || !loginCodesMatch(code, record.codeHash)) {
      return { ok: false, reason: "invalid" };
    }

    const taken = await takeMagic(redis, token);
    if (!taken) return { ok: false, reason: "invalid" };
    return { ok: true, email: taken.email };
  } catch {
    console.error("Auth magic code failed");
    return { ok: false, reason: "unavailable" };
  }
}

async function writeUserIfMissing(
  redis: AuthKv,
  userId: string,
  email: string,
): Promise<void> {
  const existing = parseUser(await redis.get<unknown>(userKey(userId)));
  if (!existing) {
    await redis.set(userKey(userId), {
      email,
      createdAt: new Date().toISOString(),
    });
  }
  await redis.sadd(USERS_INDEX_KEY, userId);
}

export async function ensureUser(
  rawEmail: string,
  client?: AuthKv,
): Promise<{ ok: true; userId: string; email: string } | AuthFailure> {
  const redis = kvFrom(client);
  const email = normalizeEmail(rawEmail);
  if (!redis) return { ok: false, reason: "unavailable" };
  if (!email) return { ok: false, reason: "invalid" };

  try {
    const existing = await redis.get<string>(userEmailKey(email));
    if (typeof existing === "string" && existing) {
      await writeUserIfMissing(redis, existing, email);
      return { ok: true, userId: existing, email };
    }

    const userId = randomUUID();
    const created = await redis.set(userEmailKey(email), userId, { nx: true });
    if (created !== "OK") {
      const winner = await redis.get<string>(userEmailKey(email));
      if (typeof winner !== "string" || !winner) {
        return { ok: false, reason: "unavailable" };
      }
      await writeUserIfMissing(redis, winner, email);
      return { ok: true, userId: winner, email };
    }

    await writeUserIfMissing(redis, userId, email);
    return { ok: true, userId, email };
  } catch {
    console.error("Auth user create failed");
    return { ok: false, reason: "unavailable" };
  }
}

export async function readUser(
  userId: string,
  client?: AuthKv,
): Promise<UserRecord | null> {
  const redis = kvFrom(client);
  if (!redis || !userId) return null;
  try {
    return parseUser(await redis.get<unknown>(userKey(userId)));
  } catch {
    console.error("Auth user read failed");
    return null;
  }
}

export async function createSession(
  userId: string,
  client?: AuthKv,
): Promise<{ ok: true; sessionId: string } | AuthFailure> {
  const redis = kvFrom(client);
  if (!redis || !userId) return { ok: false, reason: "unavailable" };
  const sessionId = generateSecretId();
  try {
    const saved = await redis.set(sessionKey(sessionId), { userId }, { ex: SESSION_TTL_SEC });
    if (saved !== "OK") return { ok: false, reason: "unavailable" };
    return { ok: true, sessionId };
  } catch {
    console.error("Auth session create failed");
    return { ok: false, reason: "unavailable" };
  }
}

/** Returns the session and slides its Redis TTL. */
export async function readSession(
  sessionId: string,
  client?: AuthKv,
): Promise<SessionRecord | null> {
  const redis = kvFrom(client);
  if (!redis || !isSecretId(sessionId)) return null;
  try {
    const record = parseSession(await redis.get<unknown>(sessionKey(sessionId)));
    if (!record) return null;
    await redis.expire(sessionKey(sessionId), SESSION_TTL_SEC);
    return record;
  } catch {
    console.error("Auth session read failed");
    return null;
  }
}

export async function destroySession(sessionId: string, client?: AuthKv): Promise<void> {
  const redis = kvFrom(client);
  if (!redis || !isSecretId(sessionId)) return;
  try {
    await redis.del(sessionKey(sessionId));
  } catch {
    console.error("Auth session destroy failed");
  }
}

export async function getUserForSession(
  sessionId: string,
  client?: AuthKv,
): Promise<{ userId: string; email: string } | null> {
  const session = await readSession(sessionId, client);
  if (!session) return null;
  const user = await readUser(session.userId, client);
  if (!user) return null;
  return { userId: session.userId, email: user.email };
}
