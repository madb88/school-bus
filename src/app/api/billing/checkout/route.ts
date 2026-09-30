import { NextResponse } from "next/server";
import { loginLinkOrigin } from "@/lib/auth/flow";
import { jsonError } from "@/lib/auth/http";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getClientIpFromHeaders } from "@/lib/auth/rate-limit";
import { createPlanCheckout } from "@/lib/billing/checkout";
import { isUserId } from "@/lib/billing/constants";
import { checkCheckoutRateLimit } from "@/lib/billing/rate-limit";

export const runtime = "nodejs";

const LOGIN_REQUIRED = "Zaloguj się, żeby kupić Plan Plus.";
const TOO_MANY = "Zbyt wiele prób. Spróbuj ponownie za chwilę.";

/** Start a hosted Stripe Checkout. Identity comes from the session, never the body. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isUserId(user.userId)) return jsonError(LOGIN_REQUIRED, 401);

  const limit = await checkCheckoutRateLimit(user.userId, getClientIpFromHeaders(request.headers));
  if (!limit.ok) return jsonError(TOO_MANY, 429, limit.retryAfterSec);

  const result = await createPlanCheckout({
    userId: user.userId,
    email: user.email,
    origin: loginLinkOrigin(request.url),
  });
  if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ url: result.url });
}
