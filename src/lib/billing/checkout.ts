import { isAllowedCheckoutUrl } from "./checkout-url";
import { readStripeCheckoutConfig } from "./config";

const CHECKOUT_FAILED = "Nie udało się rozpocząć płatności. Spróbuj później.";
const CHECKOUT_UNAVAILABLE = "Płatność nie jest teraz dostępna. Spróbuj później.";

export function buildCheckoutBody(input: {
  userId: string;
  email: string;
  priceId: string;
  redirectUrl: string;
  cancelUrl: string;
}): URLSearchParams {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("locale", "pl");
  params.set("success_url", input.redirectUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("customer_email", input.email);
  params.set("client_reference_id", input.userId);
  params.set("metadata[user_id]", input.userId);
  params.set("line_items[0][price]", input.priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("payment_intent_data[metadata][user_id]", input.userId);
  return params;
}

function readCheckoutUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const url = (payload as { url?: unknown }).url;
  if (typeof url !== "string" || !isAllowedCheckoutUrl(url)) return null;
  return url;
}

export async function createPlanCheckout(input: {
  userId: string;
  email: string;
  origin: string;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
}): Promise<{ ok: true; url: string } | { ok: false; status: number; error: string }> {
  const config = readStripeCheckoutConfig();
  if (!config) return { ok: false, status: 503, error: CHECKOUT_UNAVAILABLE };

  const origin = input.origin.replace(/\/$/, "");
  const fetchImpl = input.fetchImpl ?? fetch;

  let response: Response;
  try {
    response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildCheckoutBody({
        userId: input.userId,
        email: input.email,
        priceId: config.priceId,
        redirectUrl: `${origin}/profil?paid=1`,
        cancelUrl: `${origin}/profil`,
      }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    console.error("Stripe checkout request failed");
    return { ok: false, status: 503, error: CHECKOUT_FAILED };
  }

  if (!response.ok) {
    console.error(`Stripe checkout failed: ${response.status}`);
    return { ok: false, status: 503, error: CHECKOUT_FAILED };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    console.error("Stripe checkout response was not JSON");
    return { ok: false, status: 503, error: CHECKOUT_FAILED };
  }

  const url = readCheckoutUrl(payload);
  if (!url) {
    console.error("Stripe checkout URL rejected");
    return { ok: false, status: 503, error: CHECKOUT_FAILED };
  }
  return { ok: true, url };
}
