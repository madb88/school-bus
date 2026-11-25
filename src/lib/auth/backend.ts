import type { AccountPlan } from "@/lib/child-schedule/account-plan";
import {
  isAccountPlanId,
  parseAccountPlans,
} from "@/lib/child-schedule/account-plan";
import type { MzkRoutePreference } from "@/lib/mzk/route-preference";
import {
  AUTH_BAD_CODE,
  AUTH_BAD_DATA,
  AUTH_BAD_EMAIL,
  AUTH_TOO_MANY,
  AUTH_UNAVAILABLE,
} from "./messages";

export type BackendRole = "admin" | "school" | "individual";

/** Persisted MZK board/alight route (on a plan, or per school — deprecated). */
export type BackendMzkRoute = {
  boardStopId: string;
  alightStopId: string;
  route?: string;
};

export type BackendUserSettings = {
  defaultCityId?: string;
  defaultSchoolId?: string;
  /** Empty / omitted means all schools are visible in the board picker. */
  visibleSchoolIds?: string[];
};

export type BackendUser = {
  id: string;
  email: string;
  role: BackendRole;
  createdAt: string;
  lastLoginAt?: string;
  plans: AccountPlan[];
  settings: BackendUserSettings;
  /** Deprecated per-school MZK routes; the UI uses `plans[].mzkRoute`. */
  mzkRoutes: Record<string, BackendMzkRoute>;
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
  // FastAPI validation errors: { detail: [{ msg: "..." }, ...] }
  if (Array.isArray(record?.detail)) {
    for (const item of record.detail) {
      const entry = asRecord(item);
      if (typeof entry?.msg === "string" && entry.msg.trim()) {
        return entry.msg.trim();
      }
    }
  }
  return null;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const sec = Number.parseInt(header, 10);
  if (!Number.isFinite(sec) || sec < 1) return undefined;
  return sec;
}

function parseUserSettings(value: unknown): BackendUserSettings {
  const record = asRecord(value);
  if (!record) return {};
  const settings: BackendUserSettings = {};
  if (typeof record.defaultCityId === "string" && record.defaultCityId.trim()) {
    settings.defaultCityId = record.defaultCityId.trim();
  }
  if (
    typeof record.defaultSchoolId === "string" &&
    record.defaultSchoolId.trim()
  ) {
    settings.defaultSchoolId = record.defaultSchoolId.trim();
  }
  if (Array.isArray(record.visibleSchoolIds)) {
    const ids: string[] = [];
    for (const item of record.visibleSchoolIds) {
      if (typeof item !== "string" || !item.trim()) continue;
      const id = item.trim();
      if (!ids.includes(id)) ids.push(id);
    }
    if (ids.length > 0) settings.visibleSchoolIds = ids;
  }
  return settings;
}

function parseMzkRoute(value: unknown): BackendMzkRoute | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.boardStopId !== "string" || !record.boardStopId.trim()) {
    return null;
  }
  if (typeof record.alightStopId !== "string" || !record.alightStopId.trim()) {
    return null;
  }
  const route: BackendMzkRoute = {
    boardStopId: record.boardStopId.trim(),
    alightStopId: record.alightStopId.trim(),
  };
  if (typeof record.route === "string" && record.route.trim()) {
    route.route = record.route.trim();
  }
  return route;
}

function parseMzkRoutes(value: unknown): Record<string, BackendMzkRoute> {
  const record = asRecord(value);
  if (!record) return {};
  const out: Record<string, BackendMzkRoute> = {};
  for (const [schoolId, raw] of Object.entries(record)) {
    if (!schoolId.trim()) continue;
    const route = parseMzkRoute(raw);
    if (route) out[schoolId.trim()] = route;
  }
  return out;
}

function parseUser(value: unknown): BackendUser | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.id !== "string" || !record.id) return null;
  if (typeof record.email !== "string" || !record.email) return null;
  if (
    record.role !== "admin" &&
    record.role !== "school" &&
    record.role !== "individual"
  ) {
    return null;
  }
  if (typeof record.createdAt !== "string" || !record.createdAt) return null;
  const plans = parseAccountPlans(record.plans ?? []);
  if (!plans) return null;
  const user: BackendUser = {
    id: record.id,
    email: record.email,
    role: record.role,
    createdAt: record.createdAt,
    plans,
    settings: parseUserSettings(record.settings),
    mzkRoutes: parseMzkRoutes(record.mzkRoutes),
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

    const detail = detailFromBody(body);

    if (response.status === 422) {
      return {
        ok: false,
        status: 422,
        error: detail ?? AUTH_BAD_DATA,
        ...(retryAfterSec != null ? { retryAfterSec } : {}),
      };
    }
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
  if (!result.ok) {
    // Magic-link 422 without a useful detail should stay email-specific.
    if (result.status === 422 && result.error === AUTH_BAD_DATA) {
      return { ...result, error: AUTH_BAD_EMAIL };
    }
    return result;
  }
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

export type PlusStatus = {
  state: "active" | "pending" | "trial" | "inactive";
  validUntil?: string;
};

const CHECKOUT_FAILED = "Nie udało się rozpocząć płatności. Spróbuj później.";
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function parsePlusStatus(value: unknown): PlusStatus | null {
  const record = asRecord(value);
  if (!record) return null;
  if (
    record.state !== "active" &&
    record.state !== "pending" &&
    record.state !== "trial" &&
    record.state !== "inactive"
  ) {
    return null;
  }
  if (record.state === "active" || record.state === "trial") {
    if (typeof record.validUntil !== "string" || !YMD_RE.test(record.validUntil)) {
      return null;
    }
    return { state: record.state, validUntil: record.validUntil };
  }
  return { state: record.state };
}

async function plusFromResult(
  result: BackendAuthResult<unknown>,
): Promise<PlusStatus | "unavailable"> {
  if (!result.ok) return "unavailable";
  return parsePlusStatus(result.data) ?? "unavailable";
}

/** Start hosted Stripe Checkout for the session user. */
export async function createCheckout(
  sessionToken: string,
  clientIp: string,
): Promise<{ ok: true; url: string } | BackendAuthError> {
  const result = await backendFetch("/api/v1/billing/checkout", {
    method: "POST",
    sessionToken,
    clientIp,
  });
  if (!result.ok) return result;
  const record = asRecord(result.data);
  if (typeof record?.url !== "string" || !record.url) {
    return { ok: false, status: 503, error: CHECKOUT_FAILED };
  }
  return { ok: true, url: record.url };
}

/** Plan Plus status for the Bearer session. */
export async function fetchPlus(
  sessionToken: string,
): Promise<PlusStatus | "unavailable"> {
  const result = await backendFetch("/api/v1/billing/plus", {
    method: "GET",
    sessionToken,
  });
  return plusFromResult(result);
}

/**
 * Plan Plus of any user (service key only). Used by push dispatch, which has no
 * browser session — see backend GET /api/v1/billing/users/{user_id}/plus.
 */
export async function fetchPlusForUser(
  userId: string,
): Promise<PlusStatus | "unavailable"> {
  const result = await backendFetch(
    `/api/v1/billing/users/${encodeURIComponent(userId)}/plus`,
    { method: "GET" },
  );
  return plusFromResult(result);
}

/** Remember a Checkout return; returns the same shape as fetchPlus. */
export async function rememberPaymentReturn(
  sessionToken: string,
): Promise<PlusStatus | "unavailable"> {
  const result = await backendFetch("/api/v1/billing/plus/return", {
    method: "POST",
    sessionToken,
  });
  return plusFromResult(result);
}

/** Replace all lesson plans on the account. Passes backend Polish `detail` as `error`. */
export async function updateMyPlans(
  sessionToken: string,
  plans: AccountPlan[],
): Promise<
  | { ok: true; user: BackendUser }
  | { ok: false; status: number; error: string }
> {
  const result = await backendFetch("/api/v1/users/me", {
    method: "PATCH",
    sessionToken,
    body: { plans },
  });
  if (!result.ok) {
    return { ok: false, status: result.status, error: result.error };
  }
  const user = parseUser(result.data);
  if (!user) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }
  return { ok: true, user };
}

export type UpdateMySettingsInput = {
  defaultCityId?: string | null;
  defaultSchoolId?: string | null;
  visibleSchoolIds?: string[];
};

/**
 * Partial update of account settings. Only fields present on `settings` are sent
 * (backend merges). Empty string clears a default id; empty `visibleSchoolIds`
 * clears the filter. Passes backend Polish `detail` as `error`.
 */
export async function updateMySettings(
  sessionToken: string,
  settings: UpdateMySettingsInput,
): Promise<
  | { ok: true; user: BackendUser }
  | { ok: false; status: number; error: string }
> {
  const body: Record<string, string | string[]> = {};
  if ("defaultCityId" in settings) {
    body.defaultCityId = settings.defaultCityId?.trim() ?? "";
  }
  if ("defaultSchoolId" in settings) {
    body.defaultSchoolId = settings.defaultSchoolId?.trim() ?? "";
  }
  if ("visibleSchoolIds" in settings) {
    body.visibleSchoolIds = settings.visibleSchoolIds ?? [];
  }
  const result = await backendFetch("/api/v1/users/me/settings", {
    method: "PATCH",
    sessionToken,
    body,
  });
  if (!result.ok) {
    return { ok: false, status: result.status, error: result.error };
  }
  const user = parseUser(result.data);
  if (!user) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }
  return { ok: true, user };
}

function accountRouteBody(route: MzkRoutePreference | BackendMzkRoute): {
  boardStopId: string;
  alightStopId: string;
  route?: string;
} | null {
  const board =
    "boardStopId" in route && typeof route.boardStopId === "string"
      ? route.boardStopId.trim()
      : "";
  const alight =
    "alightStopId" in route && typeof route.alightStopId === "string"
      ? route.alightStopId.trim()
      : "";
  if (!board || !alight) return null;
  const body: { boardStopId: string; alightStopId: string; route?: string } = {
    boardStopId: board,
    alightStopId: alight,
  };
  const line =
    "route" in route && typeof route.route === "string" && route.route.trim()
      ? route.route.trim()
      : null;
  if (line) body.route = line;
  return body;
}

/** Save the MZK route for one school on the account. */
export async function putMyMzkRoute(
  sessionToken: string,
  schoolId: string,
  route: MzkRoutePreference | BackendMzkRoute,
): Promise<
  | { ok: true; user: BackendUser }
  | { ok: false; status: number; error: string }
> {
  const id = schoolId.trim();
  const body = accountRouteBody(route);
  if (!id || !body) {
    return { ok: false, status: 400, error: AUTH_BAD_DATA };
  }
  const result = await backendFetch(
    `/api/v1/users/me/mzk-routes/${encodeURIComponent(id)}`,
    { method: "PUT", sessionToken, body },
  );
  if (!result.ok) {
    return { ok: false, status: result.status, error: result.error };
  }
  const user = parseUser(result.data);
  if (!user) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }
  return { ok: true, user };
}

/** Remove the MZK route for one school (idempotent). */
export async function deleteMyMzkRoute(
  sessionToken: string,
  schoolId: string,
): Promise<
  | { ok: true; user: BackendUser }
  | { ok: false; status: number; error: string }
> {
  const id = schoolId.trim();
  if (!id) {
    return { ok: false, status: 400, error: AUTH_BAD_DATA };
  }
  const result = await backendFetch(
    `/api/v1/users/me/mzk-routes/${encodeURIComponent(id)}`,
    { method: "DELETE", sessionToken },
  );
  if (!result.ok) {
    return { ok: false, status: result.status, error: result.error };
  }
  const user = parseUser(result.data);
  if (!user) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }
  return { ok: true, user };
}

/** Save the MZK route of one of the caller's plans (by plan UUID). */
export async function putMyPlanMzkRoute(
  sessionToken: string,
  planId: string,
  route: BackendMzkRoute,
): Promise<
  | { ok: true; user: BackendUser }
  | { ok: false; status: number; error: string }
> {
  const body = accountRouteBody(route);
  if (!isAccountPlanId(planId) || !body) {
    return { ok: false, status: 400, error: AUTH_BAD_DATA };
  }
  const result = await backendFetch(
    `/api/v1/users/me/plans/${encodeURIComponent(planId)}/mzk-route`,
    { method: "PUT", sessionToken, body },
  );
  if (!result.ok) {
    return { ok: false, status: result.status, error: result.error };
  }
  const user = parseUser(result.data);
  if (!user) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }
  return { ok: true, user };
}

/** Remove the MZK route of one of the caller's plans (idempotent). */
export async function deleteMyPlanMzkRoute(
  sessionToken: string,
  planId: string,
): Promise<
  | { ok: true; user: BackendUser }
  | { ok: false; status: number; error: string }
> {
  if (!isAccountPlanId(planId)) {
    return { ok: false, status: 400, error: AUTH_BAD_DATA };
  }
  const result = await backendFetch(
    `/api/v1/users/me/plans/${encodeURIComponent(planId)}/mzk-route`,
    { method: "DELETE", sessionToken },
  );
  if (!result.ok) {
    return { ok: false, status: result.status, error: result.error };
  }
  const user = parseUser(result.data);
  if (!user) {
    return { ok: false, status: 503, error: AUTH_UNAVAILABLE };
  }
  return { ok: true, user };
}
