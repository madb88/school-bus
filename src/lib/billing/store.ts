import { getAuthRedis } from "@/lib/auth/redis";
import { toAuthKv, type AuthKv } from "@/lib/auth/store";
import { partsFromYmd } from "@/lib/dowozy/schedule-dates";
import {
  BILLING_RETURN_TTL_SEC,
  BILLING_RETURN_VALUE,
  billingReturnKey,
  entitlementKey,
  isCustomerId,
  isOrderId,
  isUserId,
  stripeOrderKey,
} from "./constants";
import { isActiveUntil } from "./school-year";

export type Entitlement = {
  status: "active" | "revoked";
  validUntil: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
};

export type StripeOrder = {
  status: "paid" | "refunded";
  userId?: string;
  validUntil?: string;
  customerId?: string;
  renewal?: boolean;
};

export function getBillingKv(): AuthKv | null {
  const redis = getAuthRedis();
  if (!redis) return null;
  return toAuthKv(redis);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function isYmd(value: unknown): value is string {
  return typeof value === "string" && partsFromYmd(value) !== null;
}

function optionalOrderId(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string" || !isOrderId(value)) return undefined;
  return value;
}

function optionalCustomerId(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string" || !isCustomerId(value)) return undefined;
  return value;
}

export function parseEntitlement(value: unknown): Entitlement | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.status !== "active" && record.status !== "revoked") return null;
  if (!isYmd(record.validUntil)) return null;
  const stripePaymentIntentId = optionalOrderId(record.stripePaymentIntentId);
  const stripeCustomerId = optionalCustomerId(record.stripeCustomerId);
  return {
    status: record.status,
    validUntil: record.validUntil,
    ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
  };
}

export function parseStripeOrder(value: unknown): StripeOrder | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.status !== "paid" && record.status !== "refunded") return null;
  const userId =
    typeof record.userId === "string" && isUserId(record.userId) ? record.userId : undefined;
  const validUntil = isYmd(record.validUntil) ? record.validUntil : undefined;
  const customerId = optionalCustomerId(record.customerId);
  if (record.status === "paid" && (!userId || !validUntil)) return null;
  return {
    status: record.status,
    ...(userId ? { userId } : {}),
    ...(validUntil ? { validUntil } : {}),
    ...(customerId ? { customerId } : {}),
    ...(record.renewal === true ? { renewal: true } : {}),
  };
}

function kvOf(client?: AuthKv): AuthKv | null {
  return client ?? getBillingKv();
}

export async function readEntitlement(
  userId: string,
  client?: AuthKv,
): Promise<Entitlement | null> {
  const kv = kvOf(client);
  if (!kv || !isUserId(userId)) return null;
  return parseEntitlement(await kv.get(entitlementKey(userId)));
}

export async function readStripeOrder(
  orderId: string,
  client?: AuthKv,
): Promise<StripeOrder | null> {
  const kv = kvOf(client);
  if (!kv || !isOrderId(orderId)) return null;
  return parseStripeOrder(await kv.get(stripeOrderKey(orderId)));
}

/** Does not shorten an active Plan. A later date replaces the order that defines it. */
export async function grantEntitlementForward(
  input: {
    userId: string;
    orderId: string;
    validUntil: string;
    customerId?: string;
    now: Date;
  },
  client?: AuthKv,
): Promise<void> {
  const kv = kvOf(client);
  if (!kv || !isUserId(input.userId) || !isOrderId(input.orderId)) return;
  const current = await readEntitlement(input.userId, kv);
  const active =
    current?.status === "active" && isActiveUntil(current.validUntil, input.now);
  if (active && current && current.validUntil >= input.validUntil) return;

  const next: Entitlement = {
    status: "active",
    validUntil: input.validUntil,
    stripePaymentIntentId: input.orderId,
  };
  if (input.customerId) next.stripeCustomerId = input.customerId;
  await kv.set(entitlementKey(input.userId), next);
}

/** Revoke only when this payment is the one currently defining Plus. */
export async function revokeEntitlementForOrder(
  userId: string,
  orderId: string,
  client?: AuthKv,
): Promise<void> {
  const kv = kvOf(client);
  if (!kv || !isUserId(userId) || !isOrderId(orderId)) return;
  const current = await readEntitlement(userId, kv);
  if (!current || current.status !== "active") return;
  if (current.stripePaymentIntentId !== orderId) return;
  await kv.set(entitlementKey(userId), { ...current, status: "revoked" });
}

export async function rememberPaymentReturn(
  userId: string,
  client?: AuthKv,
): Promise<boolean> {
  const kv = kvOf(client);
  if (!kv || !isUserId(userId)) return false;
  try {
    if ((await kv.get(billingReturnKey(userId))) === BILLING_RETURN_VALUE) return true;
    const saved = await kv.set(billingReturnKey(userId), BILLING_RETURN_VALUE, {
      ex: BILLING_RETURN_TTL_SEC,
    });
    return saved === "OK";
  } catch {
    console.error("Billing return flag failed");
    return false;
  }
}

export async function clearPaymentReturn(userId: string, client?: AuthKv): Promise<void> {
  const kv = kvOf(client);
  if (!kv || !isUserId(userId)) return;
  await kv.del(billingReturnKey(userId));
}

export async function hasPaymentReturn(userId: string, client?: AuthKv): Promise<boolean> {
  const kv = kvOf(client);
  if (!kv || !isUserId(userId)) return false;
  return (await kv.get(billingReturnKey(userId))) === BILLING_RETURN_VALUE;
}
