/** One-time magic link and 6-digit code. */
export const MAGIC_TTL_SEC = 15 * 60;

/** Session cookie and Redis TTL. Redis slides on use; the cookie is fixed at login. */
export const SESSION_TTL_SEC = 30 * 24 * 60 * 60;

/** Wrong codes allowed before the challenge is deleted. */
export const CODE_MAX_ATTEMPTS = 5;

export const MAGIC_LINK_IP_MAX = 5;
export const MAGIC_LINK_IP_WINDOW = "1 h";
export const MAGIC_LINK_IP_WINDOW_MS = 60 * 60 * 1000;

export const MAGIC_LINK_EMAIL_MAX = 3;
export const VERIFY_IP_MAX = 15;

export const RATE_LIMIT_WINDOW = "15 m";
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const SESSION_COOKIE = "sb_session";

export const USERS_INDEX_KEY = "school-bus:users:index";

const USER_PREFIX = "school-bus:user:";
const EMAIL_PREFIX = "school-bus:user:email:";
const MAGIC_PREFIX = "school-bus:magic:";
const MAGIC_EMAIL_PREFIX = "school-bus:magic:email:";
const MAGIC_ATTEMPTS_PREFIX = "school-bus:magic:attempts:";
const SESSION_PREFIX = "school-bus:session:";

export function userKey(userId: string): string {
  return `${USER_PREFIX}${userId}`;
}

export function userEmailKey(email: string): string {
  return `${EMAIL_PREFIX}${email}`;
}

export function magicKey(token: string): string {
  return `${MAGIC_PREFIX}${token}`;
}

export function magicEmailKey(email: string): string {
  return `${MAGIC_EMAIL_PREFIX}${email}`;
}

export function magicAttemptsKey(token: string): string {
  return `${MAGIC_ATTEMPTS_PREFIX}${token}`;
}

export function sessionKey(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`;
}
