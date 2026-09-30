import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAGIC_TTL_SEC,
  SESSION_TTL_SEC,
  USERS_INDEX_KEY,
  magicKey,
  sessionKey,
} from "./constants";
import { normalizeEmail } from "./email";
import {
  loginLinkOrigin,
  loginWithMagicCode,
  loginWithMagicToken,
  logoutSession,
  requestMagicLink,
} from "./flow";
import { readRequestCookie, sessionCookieOptions } from "./session-cookie";
import {
  consumeMagicCode,
  createMagicChallenge,
  getUserForSession,
  type AuthKv,
} from "./store";
import {
  generateLoginCode,
  generateSecretId,
  isSecretId,
  hashLoginCode,
  loginCodesMatch,
  openSessionId,
  sealSessionId,
} from "./token";

class MemoryKv implements AuthKv {
  private values = new Map<string, { value: unknown; expiresAt: number | null }>();
  private sets = new Map<string, Set<string>>();

  private read(key: string) {
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt != null && entry.expiresAt <= Date.now()) {
      this.values.delete(key);
      return null;
    }
    return entry;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.read(key);
    return entry ? (entry.value as T) : null;
  }

  async set(key: string, value: unknown, opts?: { ex: number } | { nx: true }) {
    if (opts && "nx" in opts && this.read(key)) return null;
    const ex = opts && "ex" in opts ? opts.ex : undefined;
    this.values.set(key, {
      value,
      expiresAt: ex != null ? Date.now() + ex * 1000 : null,
    });
    return "OK";
  }

  async getdel<T>(key: string): Promise<T | null> {
    const value = await this.get<T>(key);
    this.values.delete(key);
    return value;
  }

  async del(...keys: string[]) {
    for (const key of keys) {
      this.values.delete(key);
      this.sets.delete(key);
    }
  }

  async sadd(key: string, member: string) {
    const set = this.sets.get(key) ?? new Set<string>();
    set.add(member);
    this.sets.set(key, set);
  }

  async expire(key: string, seconds: number) {
    const entry = this.read(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async incr(key: string) {
    const entry = this.read(key);
    const current = entry && typeof entry.value === "number" ? entry.value : 0;
    const next = current + 1;
    this.values.set(key, { value: next, expiresAt: entry?.expiresAt ?? null });
    return next;
  }

  members(key: string): string[] {
    return [...(this.sets.get(key) ?? [])];
  }

  ttl(key: string): number | null {
    const entry = this.read(key);
    if (!entry?.expiresAt) return null;
    return Math.ceil((entry.expiresAt - Date.now()) / 1000);
  }

  expireIn(key: string, seconds: number) {
    const entry = this.read(key);
    if (!entry) return;
    entry.expiresAt = Date.now() + seconds * 1000;
  }
}

const allow = async () => ({ ok: true as const });

function tokenFromUrl(url: string): string {
  return new URL(url).searchParams.get("token") ?? "";
}

describe("email and tokens", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes login emails", () => {
    expect(normalizeEmail("  Ada@Example.com ")).toBe("ada@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
  });

  it("issues a 32-byte token and a 6-digit code", () => {
    const token = generateSecretId();
    expect(isSecretId(token)).toBe(true);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(generateLoginCode()).toMatch(/^\d{6}$/);
  });

  it("seals a session id and rejects tampering", () => {
    const sessionId = generateSecretId();
    const sealed = sealSessionId(sessionId);
    expect(sealed).toBeTruthy();
    expect(openSessionId(sealed!)).toBe(sessionId);
    expect(openSessionId(`${sealed!}x`)).toBeNull();
    expect(openSessionId(sessionId)).toBeNull();
  });

  it("matches the login code only against its hash", () => {
    const code = "042391";
    const codeHash = hashLoginCode(code);
    expect(codeHash).toBeTruthy();
    expect(codeHash).not.toBe(code);
    expect(loginCodesMatch(code, codeHash!)).toBe(true);
    expect(loginCodesMatch("000000", codeHash!)).toBe(false);
    expect(loginCodesMatch(code, "not-a-hash")).toBe(false);
  });

  it("reads the session cookie and sets httpOnly lax options", () => {
    expect(readRequestCookie("a=1; sb_session=abc.def; b=2")).toBe("abc.def");
    expect(sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SEC,
    });
  });
});

describe("loginLinkOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the local request origin instead of the public site", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://autobusszkolny.pl");
    expect(loginLinkOrigin("http://localhost:3000/api/auth/magic-link")).toBe(
      "http://localhost:3000",
    );
    expect(loginLinkOrigin("http://192.168.100.251:3000/login")).toBe(
      "http://192.168.100.251:3000",
    );
  });

  it("keeps the public site when the request host is not local", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://autobusszkolny.pl");
    expect(loginLinkOrigin("https://evil.example/api/auth/magic-link")).toBe(
      "https://autobusszkolny.pl",
    );
    expect(loginLinkOrigin("https://autobusszkolny.pl/api/auth/magic-link")).toBe(
      "https://autobusszkolny.pl",
    );
  });
});

describe("magic link login", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function send(memory: MemoryKv, rawEmail: string) {
    const box: { message: { to: string; url: string; code: string } | null } = {
      message: null,
    };
    const result = await requestMagicLink({
      rawEmail,
      ip: "203.0.113.10",
      origin: "https://autobus.test",
      kv: memory,
      limitIp: allow,
      limitEmail: allow,
      send: async (message) => {
        box.message = message;
        return { ok: true };
      },
    });
    return { result, captured: box.message };
  }

  it("creates the user on login, not when the mail is sent", async () => {
    const memory = new MemoryKv();
    const { result, captured } = await send(memory, "  Ada@Example.com ");

    expect(result).toEqual({ ok: true });
    expect(captured?.to).toBe("ada@example.com");
    expect(captured?.code).toMatch(/^\d{6}$/);
    expect(captured?.url.startsWith("https://autobus.test/api/auth/magic-link/verify?token=")).toBe(
      true,
    );
    expect(memory.members(USERS_INDEX_KEY)).toEqual([]);

    const stored = await memory.get<{ email: string; codeHash: string }>(
      magicKey(tokenFromUrl(captured!.url)),
    );
    expect(stored?.email).toBe("ada@example.com");
    expect(stored?.codeHash).not.toContain(captured!.code);

    const login = await loginWithMagicCode({
      rawEmail: "ada@example.com",
      rawCode: captured!.code,
      ip: "203.0.113.10",
      kv: memory,
      limitIp: allow,
    });
    expect(login.ok).toBe(true);
    if (!login.ok) return;

    const user = await getUserForSession(login.sessionId, memory);
    expect(user?.email).toBe("ada@example.com");
    expect(memory.members(USERS_INDEX_KEY)).toEqual([user?.userId]);

    const again = await send(memory, "ada@example.com");
    const second = await loginWithMagicToken(tokenFromUrl(again.captured!.url), memory);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const same = await getUserForSession(second.sessionId, memory);
    expect(same?.userId).toBe(user?.userId);
  });

  it("consumes a token once and rejects the code afterwards", async () => {
    const memory = new MemoryKv();
    const { captured } = await send(memory, "ada@example.com");
    const token = tokenFromUrl(captured!.url);

    const first = await loginWithMagicToken(token, memory);
    expect(first.ok).toBe(true);
    const second = await loginWithMagicToken(token, memory);
    expect(second).toEqual({ ok: false, reason: "invalid" });

    const code = await loginWithMagicCode({
      rawEmail: "ada@example.com",
      rawCode: captured!.code,
      ip: "203.0.113.10",
      kv: memory,
      limitIp: allow,
    });
    expect(code).toMatchObject({ ok: false, status: 400 });
  });

  it("logs out only the session that was ended", async () => {
    const memory = new MemoryKv();
    const firstMail = await send(memory, "ada@example.com");
    const first = await loginWithMagicToken(tokenFromUrl(firstMail.captured!.url), memory);
    const secondMail = await send(memory, "ada@example.com");
    const second = await loginWithMagicCode({
      rawEmail: "ada@example.com",
      rawCode: secondMail.captured!.code,
      ip: "203.0.113.11",
      kv: memory,
      limitIp: allow,
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    await logoutSession(first.sessionId, memory);
    expect(await getUserForSession(first.sessionId, memory)).toBeNull();
    expect((await getUserForSession(second.sessionId, memory))?.email).toBe("ada@example.com");
  });

  it("slides the session ttl when the session is read", async () => {
    const memory = new MemoryKv();
    const { captured } = await send(memory, "ada@example.com");
    const login = await loginWithMagicToken(tokenFromUrl(captured!.url), memory);
    expect(login.ok).toBe(true);
    if (!login.ok) return;

    memory.expireIn(sessionKey(login.sessionId), 10);
    await getUserForSession(login.sessionId, memory);
    expect(memory.ttl(sessionKey(login.sessionId)) ?? 0).toBeGreaterThan(SESSION_TTL_SEC - 5);
  });

  it("locks the challenge after too many wrong codes", async () => {
    const memory = new MemoryKv();
    const created = await createMagicChallenge("ada@example.com", memory);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    for (let i = 0; i < 5; i += 1) {
      const attempt = await consumeMagicCode("ada@example.com", "000000", memory);
      expect(attempt).toEqual({ ok: false, reason: "invalid" });
    }

    const correct = await consumeMagicCode("ada@example.com", created.code, memory);
    expect(correct).toEqual({ ok: false, reason: "invalid" });
    const byLink = await loginWithMagicToken(created.token, memory);
    expect(byLink).toEqual({ ok: false, reason: "invalid" });
  });

  it("accepts the right code before the attempt cap", async () => {
    const memory = new MemoryKv();
    const created = await createMagicChallenge("ada@example.com", memory);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    for (let i = 0; i < 4; i += 1) {
      await consumeMagicCode("ada@example.com", "000000", memory);
    }
    const correct = await consumeMagicCode("ada@example.com", created.code, memory);
    expect(correct).toEqual({ ok: true, email: "ada@example.com" });
  });

  it("discards the challenge when mail fails and does not return the code", async () => {
    const memory = new MemoryKv();
    let token = "";
    const result = await requestMagicLink({
      rawEmail: "ada@example.com",
      ip: "203.0.113.10",
      origin: "https://autobus.test",
      kv: memory,
      limitIp: allow,
      limitEmail: allow,
      send: async (message) => {
        token = tokenFromUrl(message.url);
        return { ok: false };
      },
    });

    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(JSON.stringify(result)).not.toMatch(/\d{6}/);
    expect(await loginWithMagicToken(token, memory)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("does not send when the address or the rate limit is rejected", async () => {
    const memory = new MemoryKv();
    const sendMail = vi.fn(async () => ({ ok: true as const }));

    const invalid = await requestMagicLink({
      rawEmail: "nope",
      ip: "203.0.113.12",
      kv: memory,
      limitIp: allow,
      limitEmail: allow,
      send: sendMail,
    });
    expect(invalid).toMatchObject({ ok: false, status: 400 });

    const limited = await requestMagicLink({
      rawEmail: "ada@example.com",
      ip: "203.0.113.12",
      kv: memory,
      limitIp: async () => ({ ok: false, retryAfterSec: 12 }),
      limitEmail: allow,
      send: sendMail,
    });
    expect(limited).toMatchObject({ ok: false, status: 429, retryAfterSec: 12 });
    expect(sendMail).not.toHaveBeenCalled();
    expect(MAGIC_TTL_SEC).toBe(15 * 60);
  });

  it("replaces an outstanding challenge when a new link is sent", async () => {
    const memory = new MemoryKv();
    const first = await send(memory, "ada@example.com");
    const second = await send(memory, "ada@example.com");
    expect(
      await loginWithMagicToken(tokenFromUrl(first.captured!.url), memory),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      (await loginWithMagicToken(tokenFromUrl(second.captured!.url), memory)).ok,
    ).toBe(true);
  });
});
