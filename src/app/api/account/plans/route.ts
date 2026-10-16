import { NextResponse } from "next/server";
import { updateMyPlans } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/auth/http";
import { MAX_ACCOUNT_PLANS } from "@/lib/billing/constants";
import {
  parseAccountPlans,
  serializeAccountPlans,
  type AccountPlan,
} from "@/lib/child-schedule/account-plan";

export const runtime = "nodejs";

const LOGIN_REQUIRED = "Zaloguj się, żeby zapisać plany na koncie.";
const BAD_REQUEST = "Niepoprawne żądanie.";

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(LOGIN_REQUIRED, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(BAD_REQUEST, 400);
  }

  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  if (!record || !Array.isArray(record.plans)) {
    return jsonError(BAD_REQUEST, 400);
  }
  if (record.plans.length > MAX_ACCOUNT_PLANS) {
    return jsonError(BAD_REQUEST, 400);
  }

  const plans = parseAccountPlans(record.plans);
  if (!plans) {
    // Empty list is valid; non-empty must parse. Allow [] even if parse fails on items.
    if (record.plans.length === 0) {
      return putPlans(user.sessionToken, []);
    }
    return jsonError(BAD_REQUEST, 400);
  }

  return putPlans(user.sessionToken, plans);
}

async function putPlans(token: string, plans: AccountPlan[]) {
  const result = await updateMyPlans(token, serializeAccountPlans(plans));
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json({ plans: result.user.plans });
}
