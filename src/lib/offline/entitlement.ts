import { getWarsawParts } from "@/lib/dowozy/schedule-dates";
import {
  OFFLINE_ENTITLEMENT_EVENT,
  OFFLINE_ENTITLEMENT_GRACE_DAYS,
  OFFLINE_ENTITLEMENT_KEY,
} from "./constants";

export type OfflineEntitlement = {
  validUntil: string;
  cachedAt: string;
};

function isYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseOfflineEntitlement(raw: unknown): OfflineEntitlement | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (!isYmd(record.validUntil)) return null;
  if (typeof record.cachedAt !== "string" || !record.cachedAt) return null;
  return { validUntil: record.validUntil, cachedAt: record.cachedAt };
}

function warsawYmd(now: Date = new Date()): string {
  const { year, month, day } = getWarsawParts(now);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addWarsawDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d! + days));
  const year = utc.getUTCFullYear();
  const month = utc.getUTCMonth() + 1;
  const day = utc.getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Normalize API validUntil (possibly datetime) to YYYY-MM-DD. */
export function normalizeValidUntilYmd(
  value: string | null | undefined,
): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const day = trimmed.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function loadOfflineEntitlement(): OfflineEntitlement | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OFFLINE_ENTITLEMENT_KEY);
    if (!raw) return null;
    return parseOfflineEntitlement(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function hasOfflineEntitlement(now: Date = new Date()): boolean {
  const entitlement = loadOfflineEntitlement();
  if (!entitlement) return false;
  return entitlement.validUntil >= warsawYmd(now);
}

export function saveOfflineEntitlement(validUntilYmd: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeValidUntilYmd(validUntilYmd);
  if (!normalized) return;
  const payload: OfflineEntitlement = {
    validUntil: normalized,
    cachedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(OFFLINE_ENTITLEMENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(OFFLINE_ENTITLEMENT_EVENT));
}

export function clearOfflineEntitlement(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OFFLINE_ENTITLEMENT_KEY);
  window.dispatchEvent(new Event(OFFLINE_ENTITLEMENT_EVENT));
}

/**
 * Persist or clear local Plus offline entitlement.
 * When access is true but validUntil missing, use a short Warsaw grace window.
 */
export function syncOfflineEntitlement(opts: {
  plusAccess: boolean;
  validUntil?: string | null;
}): void {
  if (!opts.plusAccess) {
    clearOfflineEntitlement();
    return;
  }
  const fromPlus = normalizeValidUntilYmd(opts.validUntil ?? null);
  const validUntil =
    fromPlus ?? addWarsawDays(warsawYmd(), OFFLINE_ENTITLEMENT_GRACE_DAYS);
  saveOfflineEntitlement(validUntil);
}
