import { createHmac, timingSafeEqual } from "node:crypto";

/** Reject signed events older than this. Stripe's own libraries use five minutes. */
export const STRIPE_SIGNATURE_TOLERANCE_SEC = 5 * 60;

/**
 * Stripe signs `${timestamp}.${rawBody}` with HMAC-SHA256.
 * The `Stripe-Signature` header carries `t` and one or more `v1` hex digests.
 */
export function stripeSignatureMatches(
  rawBody: string,
  header: string | null,
  secret: string,
  now: Date,
): boolean {
  if (!secret || !header) return false;

  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t" && timestamp === null) timestamp = value;
    if (key === "v1" && /^[0-9a-f]{64}$/i.test(value)) signatures.push(value.toLowerCase());
  }
  if (!timestamp || !/^[0-9]{1,12}$/.test(timestamp) || signatures.length === 0) return false;

  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds)) return false;
  const delta = Math.abs(Math.floor(now.getTime() / 1000) - seconds);
  if (delta > STRIPE_SIGNATURE_TOLERANCE_SEC) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");
  const left = Buffer.from(expected, "utf8");
  return signatures.some((signature) => {
    const right = Buffer.from(signature, "utf8");
    return left.length === right.length && timingSafeEqual(left, right);
  });
}
