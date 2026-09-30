import { getSiteUrl } from "@/lib/site-metadata";
import { normalizeEmail } from "./email";
import { isMagicLinkMailConfigured, sendMagicLinkEmail } from "./mail";
import {
  checkMagicLinkEmailRateLimit,
  checkMagicLinkIpRateLimit,
  checkVerifyIpRateLimit,
} from "./rate-limit";
import { getAuthRedis } from "./redis";
import {
  consumeMagicCode,
  consumeMagicToken,
  createMagicChallenge,
  createSession,
  destroySession,
  discardMagicChallenge,
  ensureUser,
  type AuthFailure,
  type AuthKv,
} from "./store";
import { authSecret } from "./token";

type RateResult = { ok: boolean; retryAfterSec?: number };

export type FlowError = {
  ok: false;
  status: number;
  error: string;
  retryAfterSec?: number;
};

const UNAVAILABLE = "Logowanie e-mailem nie jest teraz dostępne. Spróbuj później.";
const SENT_FAILURE = "Nie udało się wysłać wiadomości. Spróbuj później.";
const TOO_MANY = "Zbyt wiele prób. Spróbuj ponownie za chwilę.";
const BAD_EMAIL = "Podaj prawidłowy adres e-mail.";
const BAD_CODE = "Nieprawidłowy lub wygasły kod.";

function unavailable(status = 503): FlowError {
  return { ok: false, status, error: UNAVAILABLE };
}

function storeReady(client?: AuthKv): boolean {
  if (!authSecret()) return false;
  if (client) return true;
  return getAuthRedis() !== null;
}

export function magicLinkVerifyUrl(origin: string, token: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
}

function isLocalHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return false;
  const octets = parts.map(Number);
  const [a, b] = octets;
  if (octets.some((octet) => octet > 255)) return false;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  return a === 172 && b >= 16 && b <= 31;
}

/**
 * Link in the email must hit the app that created it.
 * Local dev uses the request origin; anything else stays on the public site URL
 * so a forged Host cannot put the token on another domain.
 */
export function loginLinkOrigin(requestUrl: string): string {
  let requestOrigin = "";
  let hostname = "";
  try {
    const url = new URL(requestUrl);
    requestOrigin = url.origin;
    hostname = url.hostname;
  } catch {
    return getSiteUrl();
  }

  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured && requestOrigin === configured) return requestOrigin;
  if (isLocalHostname(hostname)) return requestOrigin;
  return getSiteUrl();
}

export async function requestMagicLink(input: {
  rawEmail: string;
  ip: string;
  origin?: string;
  kv?: AuthKv;
  limitIp?: (ip: string) => Promise<RateResult>;
  limitEmail?: (email: string) => Promise<RateResult>;
  send?: (message: { to: string; url: string; code: string }) => Promise<{ ok: true } | { ok: false }>;
}): Promise<{ ok: true } | FlowError> {
  if (!storeReady(input.kv)) return unavailable();
  if (!input.send && !isMagicLinkMailConfigured()) return unavailable();

  const limitIp = input.limitIp ?? checkMagicLinkIpRateLimit;
  const limitEmail = input.limitEmail ?? checkMagicLinkEmailRateLimit;
  const send = input.send ?? sendMagicLinkEmail;

  const ipLimit = await limitIp(input.ip);
  if (!ipLimit.ok) {
    return {
      ok: false,
      status: 429,
      error: TOO_MANY,
      retryAfterSec: ipLimit.retryAfterSec,
    };
  }

  const email = normalizeEmail(input.rawEmail);
  if (!email) return { ok: false, status: 400, error: BAD_EMAIL };

  const emailLimit = await limitEmail(email);
  if (!emailLimit.ok) {
    return {
      ok: false,
      status: 429,
      error: TOO_MANY,
      retryAfterSec: emailLimit.retryAfterSec,
    };
  }

  const created = await createMagicChallenge(email, input.kv);
  if (!created.ok) return unavailable();

  const origin = input.origin ?? getSiteUrl();
  const sent = await send({
    to: created.email,
    url: magicLinkVerifyUrl(origin, created.token),
    code: created.code,
  });
  if (!sent.ok) {
    await discardMagicChallenge(created.token, created.email, input.kv);
    return { ok: false, status: 503, error: SENT_FAILURE };
  }

  return { ok: true };
}

async function openSession(
  email: string,
  client?: AuthKv,
): Promise<{ ok: true; sessionId: string; email: string } | AuthFailure> {
  const user = await ensureUser(email, client);
  if (!user.ok) return user;
  const session = await createSession(user.userId, client);
  if (!session.ok) return session;
  return { ok: true, sessionId: session.sessionId, email: user.email };
}

export async function loginWithMagicToken(
  token: string,
  client?: AuthKv,
): Promise<{ ok: true; sessionId: string; email: string } | AuthFailure> {
  if (!storeReady(client)) return { ok: false, reason: "unavailable" };
  const consumed = await consumeMagicToken(token, client);
  if (!consumed.ok) return consumed;
  return openSession(consumed.email, client);
}

export async function loginWithMagicCode(input: {
  rawEmail: string;
  rawCode: string;
  ip: string;
  kv?: AuthKv;
  limitIp?: (ip: string) => Promise<RateResult>;
}): Promise<{ ok: true; sessionId: string; email: string } | FlowError> {
  if (!storeReady(input.kv)) return unavailable();

  const limitIp = input.limitIp ?? checkVerifyIpRateLimit;
  const ipLimit = await limitIp(input.ip);
  if (!ipLimit.ok) {
    return {
      ok: false,
      status: 429,
      error: TOO_MANY,
      retryAfterSec: ipLimit.retryAfterSec,
    };
  }

  const consumed = await consumeMagicCode(input.rawEmail, input.rawCode, input.kv);
  if (!consumed.ok) {
    if (consumed.reason === "unavailable") return unavailable();
    return { ok: false, status: 400, error: BAD_CODE };
  }

  const session = await openSession(consumed.email, input.kv);
  if (!session.ok) return unavailable();
  return { ok: true, sessionId: session.sessionId, email: session.email };
}

export async function logoutSession(sessionId: string | null, client?: AuthKv): Promise<void> {
  if (!sessionId) return;
  await destroySession(sessionId, client);
}
