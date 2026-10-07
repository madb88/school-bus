import { ensureUserByEmail, getUserById } from "@/lib/auth/backend";
import { normalizeEmail } from "@/lib/auth/email";
import { deletePushRecordsForUser } from "@/lib/push/store";
import type { Kv } from "@/lib/redis/kv";
import { isCustomerId, isOrderId, isPriceId, isSessionId, isUserId, stripeOrderKey, stripeReceiptKey, STRIPE_RECEIPT_SENT } from "./constants";
import { sendPlusPurchaseEmail } from "./receipt";
import { stripeSignatureMatches } from "./signature";
import { isPlusRenewal, nextPlusValidUntil, warsawToday } from "./school-year";
import {
  clearPaymentReturn,
  grantEntitlementForward,
  parseStripeOrder,
  readEntitlement,
  revokeEntitlementForOrder,
  type StripeOrder,
} from "./store";

export type WebhookResult = { ok: true } | { ok: false; status: 400 | 401 | 500 | 503 };

type CustomUser = "absent" | "invalid" | { id: string };

type PriceRead = string | "mixed" | null;

type ParsedPayment = {
  orderId: string;
  sessionId: string;
  email: string | null;
  customUser: CustomUser;
  customerId?: string;
  createdAt: Date | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readPaymentIntent(value: unknown): string | null {
  if (typeof value === "string" && isOrderId(value)) return value;
  const record = asRecord(value);
  if (record && typeof record.id === "string" && isOrderId(record.id)) return record.id;
  return null;
}

function readCustomer(value: unknown): string | undefined {
  if (typeof value === "string" && isCustomerId(value)) return value;
  const record = asRecord(value);
  const id = record?.id;
  if (typeof id === "string" && isCustomerId(id)) return id;
  return undefined;
}

function readCustomUser(metadata: unknown): CustomUser {
  if (metadata == null) return "absent";
  const record = asRecord(metadata);
  if (!record) return "invalid";
  if (!("user_id" in record) || record.user_id == null || record.user_id === "") return "absent";
  if (typeof record.user_id !== "string") return "invalid";
  const id = record.user_id.trim().toLowerCase();
  if (!isUserId(id)) return "invalid";
  return { id };
}

function readEmail(session: Record<string, unknown>): string | null {
  const details = asRecord(session.customer_details);
  const fromDetails = typeof details?.email === "string" ? details.email : null;
  const fromSession = typeof session.customer_email === "string" ? session.customer_email : null;
  const raw = fromDetails ?? fromSession;
  if (!raw) return null;
  return normalizeEmail(raw);
}

function readCreatedAt(value: unknown): Date | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const parsed = new Date(value * 1000);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** The single Price on a Checkout Session line-item list. `mixed` is some other cart. */
export function priceIdFromLineItems(payload: unknown): PriceRead {
  const root = asRecord(payload);
  if (!root || root.has_more === true) return root?.has_more === true ? "mixed" : null;
  const data = root.data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const ids: string[] = [];
  for (const item of data) {
    const record = asRecord(item);
    const price = record?.price;
    const id =
      typeof price === "string"
        ? price
        : typeof asRecord(price)?.id === "string"
          ? (asRecord(price)?.id as string)
          : null;
    if (!id || !isPriceId(id)) return null;
    ids.push(id);
  }
  const unique = new Set(ids);
  if (unique.size !== 1) return "mixed";
  return ids[0] ?? null;
}

function readPaidSession(payload: unknown): ParsedPayment | null {
  const session = asRecord(asRecord(asRecord(payload)?.data)?.object);
  if (!session || session.object !== "checkout.session") return null;
  if (session.mode !== "payment" || session.payment_status !== "paid") return null;
  if (typeof session.id !== "string" || !isSessionId(session.id)) return null;
  const orderId = readPaymentIntent(session.payment_intent);
  if (!orderId) return null;
  const customerId = readCustomer(session.customer);
  return {
    orderId,
    sessionId: session.id,
    email: readEmail(session),
    customUser: readCustomUser(session.metadata),
    ...(customerId ? { customerId } : {}),
    createdAt: readCreatedAt(session.created),
  };
}

function sessionPaymentStatus(payload: unknown): string | null {
  const session = asRecord(asRecord(asRecord(payload)?.data)?.object);
  if (!session || session.object !== "checkout.session") return null;
  return typeof session.payment_status === "string" ? session.payment_status : null;
}

function readRefund(payload: unknown): { orderId: string; refunded: boolean } | null {
  const charge = asRecord(asRecord(asRecord(payload)?.data)?.object);
  if (!charge || charge.object !== "charge") return null;
  if (typeof charge.refunded !== "boolean") return null;
  const orderId = readPaymentIntent(charge.payment_intent);
  if (!orderId) return null;
  return { orderId, refunded: charge.refunded };
}

function eventName(payload: unknown): string | null {
  const name = asRecord(payload)?.type;
  return typeof name === "string" ? name : null;
}

async function resolveUser(
  payment: ParsedPayment,
): Promise<{ ok: true; userId: string } | { ok: false; retry: boolean }> {
  if (payment.customUser === "invalid") return { ok: false, retry: false };
  if (typeof payment.customUser === "object") {
    const user = await getUserById(payment.customUser.id);
    if (user === "unavailable") return { ok: false, retry: true };
    if (!user) return { ok: false, retry: false };
    return { ok: true, userId: user.id };
  }
  if (!payment.email) return { ok: false, retry: false };
  const ensured = await ensureUserByEmail(payment.email);
  if (ensured === "unavailable" || !ensured) return { ok: false, retry: true };
  return { ok: true, userId: ensured.id };
}

async function loadOrder(kv: Kv, orderId: string): Promise<StripeOrder | null | "bad"> {
  const raw = await kv.get(stripeOrderKey(orderId));
  if (raw == null) return null;
  const parsed = parseStripeOrder(raw);
  if (!parsed) return "bad";
  return parsed;
}

async function finishRefund(kv: Kv, userId: string, orderId: string): Promise<void> {
  await revokeEntitlementForOrder(userId, orderId, kv);
  await clearPaymentReturn(userId, kv);
  const entitlement = await readEntitlement(userId, kv);
  if (entitlement?.status === "active") return;
  await deletePushRecordsForUser(userId);
}

async function applyRefund(kv: Kv, orderId: string): Promise<void> {
  const existing = await loadOrder(kv, orderId);
  if (existing === "bad") throw new Error("order");
  if (existing?.status === "refunded") {
    if (existing.userId) await finishRefund(kv, existing.userId, orderId);
    return;
  }
  if (existing?.status === "paid" && existing.userId) {
    const next: StripeOrder = { ...existing, status: "refunded" };
    await kv.set(stripeOrderKey(orderId), next);
    await finishRefund(kv, existing.userId, orderId);
    return;
  }

  const claimed = await kv.set(stripeOrderKey(orderId), { status: "refunded" }, { nx: true });
  if (claimed === "OK") return;

  const again = await loadOrder(kv, orderId);
  if (again === "bad") throw new Error("order");
  if (again?.status === "paid" && again.userId) {
    await kv.set(stripeOrderKey(orderId), { ...again, status: "refunded" });
    await finishRefund(kv, again.userId, orderId);
  }
}

type ReceiptMail = {
  to: string;
  startedOn: string;
  endsOn: string;
  renewal: boolean;
};

async function sendReceiptOnce(
  kv: Kv,
  input: {
    orderId: string;
    userId: string;
    startedAt: Date | null;
    validUntil: string;
    renewal: boolean;
    now: Date;
  },
  send: (mail: ReceiptMail) => Promise<boolean>,
): Promise<"ok" | "retry"> {
  const key = stripeReceiptKey(input.orderId);
  if ((await kv.get(key)) === STRIPE_RECEIPT_SENT) return "ok";

  const account = await getUserById(input.userId);
  if (account === "unavailable") return "retry";
  const to = account ? normalizeEmail(account.email) : null;
  if (!to) {
    console.error("Billing receipt skipped: payer has no address");
    return "ok";
  }

  const entitlement = await readEntitlement(input.userId, kv);
  const endsOn =
    entitlement?.status === "active" ? entitlement.validUntil : input.validUntil;
  const startedOn = warsawToday(input.startedAt ?? input.now);
  const claimed = await kv.set(key, STRIPE_RECEIPT_SENT, { nx: true });
  if (claimed !== "OK") return "ok";

  try {
    const sent = await send({ to, startedOn, endsOn, renewal: input.renewal });
    if (!sent) {
      await kv.del(key);
      return "retry";
    }
  } catch {
    console.error("Plan Plus receipt email failed");
    await kv.del(key);
    return "retry";
  }
  return "ok";
}

async function applyPaid(
  kv: Kv,
  payment: ParsedPayment,
  now: Date,
  send: (mail: ReceiptMail) => Promise<boolean>,
): Promise<"ok" | "retry"> {
  const existing = await loadOrder(kv, payment.orderId);
  if (existing === "bad") return "retry";
  if (existing?.status === "refunded") {
    const flagged =
      existing.userId ??
      (typeof payment.customUser === "object" ? payment.customUser.id : undefined);
    if (flagged) await clearPaymentReturn(flagged, kv);
    return "ok";
  }

  let userId = existing?.status === "paid" ? existing.userId : undefined;
  if (!userId) {
    const resolved = await resolveUser(payment);
    if (!resolved.ok) {
      if (!resolved.retry) console.error("Billing webhook skipped: payer not attached");
      return resolved.retry ? "retry" : "ok";
    }
    userId = resolved.userId;
  }

  const purchaseAt = payment.createdAt ?? now;
  let renewal = existing?.renewal === true;
  let validUntil = existing?.validUntil;
  if (!existing) {
    const current = await readEntitlement(userId, kv);
    renewal = isPlusRenewal(purchaseAt, current);
    validUntil = nextPlusValidUntil(purchaseAt, current);
  }
  if (!validUntil) return "retry";

  if (!existing) {
    const record: StripeOrder = {
      status: "paid",
      userId,
      validUntil,
      ...(payment.customerId ? { customerId: payment.customerId } : {}),
      ...(renewal ? { renewal: true } : {}),
    };
    const claimed = await kv.set(stripeOrderKey(payment.orderId), record, { nx: true });
    if (claimed !== "OK") {
      const winner = await loadOrder(kv, payment.orderId);
      if (winner === "bad" || !winner) return "retry";
      if (winner.status === "refunded") {
        await clearPaymentReturn(winner.userId ?? userId, kv);
        return "ok";
      }
    }
  }

  await grantEntitlementForward(
    {
      userId,
      orderId: payment.orderId,
      validUntil,
      customerId: payment.customerId,
      now,
    },
    kv,
  );
  await clearPaymentReturn(userId, kv);

  const after = await loadOrder(kv, payment.orderId);
  if (after === "bad") return "retry";
  if (after?.status === "refunded") {
    await revokeEntitlementForOrder(userId, payment.orderId, kv);
    return "ok";
  }
  return sendReceiptOnce(
    kv,
    {
      orderId: payment.orderId,
      userId,
      startedAt: payment.createdAt,
      validUntil,
      renewal,
      now,
    },
    send,
  );
}

const PAID_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

async function lookupSessionPrice(
  sessionId: string,
  apiKey: string,
  fetchImpl: FetchImpl,
): Promise<PriceRead> {
  if (!isSessionId(sessionId)) return null;
  let response: Response;
  try {
    response = await fetchImpl(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=10`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      },
    );
  } catch {
    console.error("Stripe line items request failed");
    return null;
  }
  if (!response.ok) {
    console.error(`Stripe line items failed: ${response.status}`);
    return null;
  }
  try {
    return priceIdFromLineItems(await response.json());
  } catch {
    console.error("Stripe line items response was not JSON");
    return null;
  }
}

/**
 * Signature is checked before any Redis write.
 * Plus is granted only when the Checkout Session's Price is Plan Plus.
 * A refund revokes Plus only for the user stored on that PaymentIntent.
 */
export async function handleStripeWebhook(input: {
  rawBody: string;
  signature: string | null;
  secret: string;
  priceId: string;
  apiKey: string;
  kv: Kv | null;
  now?: Date;
  lookupPrice?: (sessionId: string) => Promise<PriceRead>;
  fetchImpl?: FetchImpl;
  sendReceipt?: (mail: ReceiptMail) => Promise<boolean>;
}): Promise<WebhookResult> {
  const now = input.now ?? new Date();
  if (!stripeSignatureMatches(input.rawBody, input.signature, input.secret, now)) {
    return { ok: false, status: 401 };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    return { ok: false, status: 400 };
  }

  const event = eventName(payload);
  if (!event) return { ok: false, status: 400 };
  if (event !== "charge.refunded" && !PAID_EVENTS.has(event)) return { ok: true };

  try {
    if (event === "charge.refunded") {
      const refund = readRefund(payload);
      if (!refund) {
        console.error("Billing webhook payload incomplete");
        return { ok: false, status: 500 };
      }
      if (!refund.refunded) return { ok: true };
      if (!input.kv) return { ok: false, status: 503 };
      await applyRefund(input.kv, refund.orderId);
      return { ok: true };
    }

    const session = asRecord(asRecord(asRecord(payload)?.data)?.object);
    if (
      session?.object === "checkout.session" &&
      typeof session.mode === "string" &&
      session.mode !== "payment"
    ) {
      return { ok: true };
    }
    const status = sessionPaymentStatus(payload);
    if (status && status !== "paid") return { ok: true };

    const payment = readPaidSession(payload);
    if (!payment) {
      console.error("Billing webhook payload incomplete");
      return { ok: false, status: 500 };
    }

    const lookup =
      input.lookupPrice ??
      ((sessionId: string) =>
        lookupSessionPrice(sessionId, input.apiKey, input.fetchImpl ?? fetch));
    const price = await lookup(payment.sessionId);
    if (price == null) return { ok: false, status: 500 };
    if (price === "mixed" || price !== input.priceId) return { ok: true };
    if (!input.kv) return { ok: false, status: 503 };

    const paid = await applyPaid(
      input.kv,
      payment,
      now,
      input.sendReceipt ?? sendPlusPurchaseEmail,
    );
    if (paid === "retry") return { ok: false, status: 500 };
    return { ok: true };
  } catch {
    console.error("Billing webhook failed");
    return { ok: false, status: 500 };
  }
}
