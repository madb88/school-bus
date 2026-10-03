/** Hosted Stripe Checkout only. Rejects anything else before a redirect. */
export function isAllowedCheckoutUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  return url.hostname.toLowerCase() === "checkout.stripe.com";
}
