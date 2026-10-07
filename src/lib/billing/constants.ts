/** Shown on the profile. The charged amount is the Stripe Price, not this label. */
export const PLUS_PRICE_LABEL = "30 zł";

/** How long a return from checkout stays "payment in progress" without an entitlement. */
export const BILLING_RETURN_TTL_SEC = 2 * 60 * 60;

/**
 * Stored as a word, not "1". Upstash JSON-decodes "1" into the number 1,
 * which would drop the in-progress state after redirect.
 */
export const BILLING_RETURN_VALUE = "pending";

export const CHECKOUT_USER_MAX = 8;
export const COMPLAINT_USER_MAX = 3;
export const CHECKOUT_IP_MAX = 30;
export const CHECKOUT_WINDOW = "15 m";
export const CHECKOUT_WINDOW_MS = 15 * 60 * 1000;

const USER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const ENTITLEMENT_PREFIX = "school-bus:entitlement:";
const ORDER_PREFIX = "school-bus:stripe-order:";
const RETURN_PREFIX = "school-bus:billing-return:";
const RECEIPT_PREFIX = "school-bus:stripe-receipt:";

/** Stored as a word. Upstash JSON-decodes "1" into the number 1. */
export const STRIPE_RECEIPT_SENT = "sent";

function isStripeId(value: string, prefix: string): boolean {
  if (value.length > 255 || !value.startsWith(prefix)) return false;
  const body = value.slice(prefix.length);
  return body.length >= 8 && /^[A-Za-z0-9_]+$/.test(body);
}

export function isUserId(value: string): boolean {
  return USER_ID_RE.test(value);
}

/** PaymentIntent id. Refunds and the entitlement both key off this, not the Checkout Session. */
export function isOrderId(value: string): boolean {
  return isStripeId(value, "pi_");
}

export function isSessionId(value: string): boolean {
  return isStripeId(value, "cs_");
}

export function isCustomerId(value: string): boolean {
  return isStripeId(value, "cus_");
}

export function isPriceId(value: string): boolean {
  return isStripeId(value, "price_");
}

export function entitlementKey(userId: string): string {
  return `${ENTITLEMENT_PREFIX}${userId}`;
}

export function stripeOrderKey(orderId: string): string {
  return `${ORDER_PREFIX}${orderId}`;
}

export function billingReturnKey(userId: string): string {
  return `${RETURN_PREFIX}${userId}`;
}

export function stripeReceiptKey(orderId: string): string {
  return `${RECEIPT_PREFIX}${orderId}`;
}
