import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const RANDOM_ID_RE = /^[A-Za-z0-9_-]{43}$/;
const LOGIN_CODE_RE = /^\d{6}$/;

export function authSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret || null;
}

/** 32 random bytes, base64url (magic link token and session id). */
export function generateSecretId(): string {
  return randomBytes(32).toString("base64url");
}

export function isSecretId(value: string): boolean {
  return RANDOM_ID_RE.test(value);
}

export function generateLoginCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function normalizeLoginCode(input: string): string | null {
  const code = input.replace(/\s+/g, "");
  return LOGIN_CODE_RE.test(code) ? code : null;
}

export function hashLoginCode(code: string): string | null {
  const secret = authSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`login-code.v1:${code}`).digest("base64url");
}

export function loginCodesMatch(code: string, codeHash: string): boolean {
  const actual = hashLoginCode(code);
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(codeHash);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Cookie value: sessionId.hmac — the id itself is what Redis stores. */
export function sealSessionId(sessionId: string): string | null {
  const secret = authSecret();
  if (!secret || !isSecretId(sessionId)) return null;
  const sig = createHmac("sha256", secret).update(`session.v1:${sessionId}`).digest("base64url");
  return `${sessionId}.${sig}`;
}

export function openSessionId(sealed: string): string | null {
  const secret = authSecret();
  if (!secret) return null;
  const dot = sealed.lastIndexOf(".");
  if (dot <= 0) return null;
  const sessionId = sealed.slice(0, dot);
  const sig = sealed.slice(dot + 1);
  if (!isSecretId(sessionId)) return null;
  const expected = createHmac("sha256", secret)
    .update(`session.v1:${sessionId}`)
    .digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!timingSafeEqual(left, right)) return null;
  return sessionId;
}
