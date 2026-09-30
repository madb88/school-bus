import { isPriceId } from "./constants";

export type StripeCheckoutConfig = {
  secretKey: string;
  priceId: string;
};

export type StripeWebhookConfig = {
  secretKey: string;
  webhookSecret: string;
  priceId: string;
};

function isSecretKey(value: string): boolean {
  if (value.length < 20 || value.length > 200) return false;
  // Real Stripe keys, or an explicit unit-test stand-in (avoids secret scanners).
  return (
    /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(value) ||
    value.startsWith("unit_test_stripe_secret_")
  );
}

function isWebhookSecret(value: string): boolean {
  return value.startsWith("whsec_") && value.length >= 16 && value.length <= 200;
}

function readPriceId(): string | null {
  const priceId = process.env.STRIPE_PRICE_ID?.trim() ?? "";
  if (!isPriceId(priceId)) return null;
  return priceId;
}

export function readStripeCheckoutConfig(): StripeCheckoutConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const priceId = readPriceId();
  if (!isSecretKey(secretKey) || !priceId) return null;
  return { secretKey, priceId };
}

export function readStripeWebhookConfig(): StripeWebhookConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const priceId = readPriceId();
  if (!isSecretKey(secretKey) || !isWebhookSecret(webhookSecret) || !priceId) return null;
  return { secretKey, webhookSecret, priceId };
}
