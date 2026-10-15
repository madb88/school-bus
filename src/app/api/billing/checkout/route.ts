import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/auth/http";
import { getClientIpFromHeaders } from "@/lib/auth/rate-limit";
import { isAllowedCheckoutUrl } from "@/lib/billing/checkout-url";

export const runtime = "nodejs";

const LOGIN_REQUIRED = "Zaloguj się, żeby kupić Plan Plus.";
const CHECKOUT_FAILED = "Nie udało się rozpocząć płatności. Spróbuj później.";

/** Start a hosted Stripe Checkout via the billing backend. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(LOGIN_REQUIRED, 401);

  const result = await createCheckout(
    user.sessionToken,
    getClientIpFromHeaders(request.headers),
  );
  if (!result.ok) return jsonError(result.error, result.status, result.retryAfterSec);
  if (!isAllowedCheckoutUrl(result.url)) return jsonError(CHECKOUT_FAILED, 503);
  return NextResponse.json({ url: result.url });
}
