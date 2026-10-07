import {
  AUTH_BAD_CODE,
  AUTH_BAD_EMAIL,
  AUTH_TOO_MANY,
  AUTH_UNAVAILABLE,
} from "./messages";

export type BackendUser = {
  id: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  lastLoginAt?: string;
};

export type BackendAuthError = {
  ok: false;
  status: number;
  error: string;
  retryAfterSec?: number;
};

export type BackendAuthOk<T> = { ok: true; status: number; data: T };

export type BackendAuthResult<T> = BackendAuthOk<T> | BackendAuthError;

type BackendConfig = { baseUrl: string; serviceKey: string };

export function backendConfig(): BackendConfig | null {
  const baseUrl = process.env.BACKEND_API_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.BACKEND_SERVICE_KEY?.trim();
  if (!baseUrl || !serviceKey) return null;
  return { baseUrl, serviceKey };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function detailFromBody(body: unknown): string | null {
  const record = asRecord(body);
  if (typeof record?.detail === "string" && record.detail.trim()) {
    return record.detail.trim();
  }
  return null;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const sec = Number.parseInt(header, 10);
  if (!Number.isFinite(sec) || sec < 1) return undefined;
  return sec;
}

function parseUser(value: unknown): BackendUser | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.id !== "string" || !record.id) return null;
  if (typeof record.email !== "string" || !record.email) return null;
  if (record.role !== "user" && record.role !== "admin") return null;
  if (typeof record.createdAt !== "string" || !record.createdAt) return null;
  const user: BackendUser = {
    id: record.id,
    email: record.email,
    role: record.role,
    createdAt: record.createdAt,
  };
  if (typeof record.lastLoginAt === "string" && record.lastLoginAt) {
    user.lastLoginAt = record.lastLoginAt;
  }
  return user;
}

type SessionPayload = {
  sessionToken: string;
  expiresAt?: string;
  user: BackendUser;
};

function parseSessionPayload(value: unknown): SessionPayload | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.sessionToken !== "string" || !record.sessionToken) return null;
  const user = parseUser(record.user);
  if (!user) return null;
  const payload: SessionPayload = { sessionToken: record.sessionToken, user };
  if (typeof record.expiresAt === "string" && record.expiresAt) {
    payload.expiresAt = record.expiresAt;
  }
  return payload;
}

export async function backendFetch(
  path: string,
  options: {
    method: string;
    body?: unknown;
    sessionToken?: string;
    clientIp?: string;
    timeoutMs?: number;
  },
): Promise<BackendAuthResult<unknown>> {
  const config = backendConfig();
  if (!config) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }

  const headers: Record<string, string> = {
    "X-Service-Key": config.serviceKey,
  };
  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (options.sessionToken) {
    headers.Authorization = `Bearer ${options.sessionToken}`;
  }
  if (options.clientIp) {
    headers["X-Client-IP"] = options.clientIp;
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 8_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${config.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      signal: controller.signal,
    });

    const retryAfterSec = parseRetryAfter(response.headers.get("Retry-After"));
    let body: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = null;
      }
    }

    if (response.ok) {
      return { ok: true, status: response.status, data: body };
    }

    if (response.status === 422) {
      return {
        ok: false,
        status: 422,
        error: AUTH_BAD_EMAIL,
        ...(retryAfterSec != null ? { retryAfterSec } : {}),
      };
    }

    const detail = detailFromBody(body);
    const error =
      detail ??
      (response.status === 429
        ? AUTH_TOO_MANY
        : response.status === 400
          ? AUTH_BAD_CODE
          : AUTH_UNAVAILABLE);

    return {
      ok: false,
      status: response.status,
      error,
      ...(retryAfterSec != null ? { retryAfterSec } : {}),
    };
  } catch {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestMagicLink(
  email: string,
  clientIp: string,
): Promise<{ ok: true } | BackendAuthError> {
  const result = await backendFetch("/api/v1/auth/magic-link", {
    method: "POST",
    body: { email },
    clientIp,
  });
  if (!result.ok) return result;
  return { ok: true };
}

export async function verifyLink(
  token: string,
  previousToken?: string | null,
): Promise<BackendAuthResult<SessionPayload>> {
  const result = await backendFetch("/api/v1/auth/magic-link/verify-link", {
    method: "POST",
    body: { token },
    ...(previousToken ? { sessionToken: previousToken } : {}),
  });
  if (!result.ok) return result;
  const data = parseSessionPayload(result.data);
  if (!data) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }
  return { ok: true, status: result.status, data };
}

export async function verifyCode(
  email: string,
  code: string,
  clientIp: string,
  previousToken?: string | null,
): Promise<BackendAuthResult<SessionPayload>> {
  const result = await backendFetch("/api/v1/auth/magic-link/verify-code", {
    method: "POST",
    body: { email, code },
    clientIp,
    ...(previousToken ? { sessionToken: previousToken } : {}),
  });
  if (!result.ok) return result;
  const data = parseSessionPayload(result.data);
  if (!data) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }
  return { ok: true, status: result.status, data };
}

export async function logout(sessionToken: string): Promise<void> {
  await backendFetch("/api/v1/auth/logout", {
    method: "POST",
    sessionToken,
  });
}

export async function fetchMe(
  sessionToken: string,
): Promise<BackendUser | null | "unavailable"> {
  const result = await backendFetch("/api/v1/users/me", {
    method: "GET",
    sessionToken,
  });
  if (!result.ok) {
    if (result.status === 401) return null;
    return "unavailable";
  }
  return parseUser(result.data) ?? "unavailable";
}

export async function getUserById(
  id: string,
): Promise<BackendUser | null | "unavailable"> {
  const result = await backendFetch(`/api/v1/users/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  if (!result.ok) {
    if (result.status === 404) return null;
    return "unavailable";
  }
  return parseUser(result.data) ?? "unavailable";
}

export async function ensureUserByEmail(
  email: string,
): Promise<BackendUser | null | "unavailable"> {
  const result = await backendFetch("/api/v1/users", {
    method: "POST",
    body: { email },
  });
  if (!result.ok) return "unavailable";
  return parseUser(result.data) ?? "unavailable";
}
