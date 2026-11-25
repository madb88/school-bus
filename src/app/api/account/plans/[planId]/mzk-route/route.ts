import { NextResponse } from "next/server";
import {
  deleteMyPlanMzkRoute,
  putMyPlanMzkRoute,
} from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/auth/http";
import {
  isAccountPlanId,
  parseAccountMzkRoute,
} from "@/lib/child-schedule/account-plan";

export const runtime = "nodejs";

const LOGIN_REQUIRED = "Zaloguj się, żeby zapisać trasę MZK na koncie.";
const BAD_REQUEST = "Niepoprawne żądanie.";

type RouteContext = {
  params: Promise<{ planId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError(LOGIN_REQUIRED, 401);

  const { planId } = await context.params;
  if (!isAccountPlanId(planId)) return jsonError(BAD_REQUEST, 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(BAD_REQUEST, 400);
  }
  const route = parseAccountMzkRoute(body);
  if (!route) return jsonError(BAD_REQUEST, 400);

  const result = await putMyPlanMzkRoute(user.sessionToken, planId, route);
  if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ plans: result.user.plans });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return jsonError(LOGIN_REQUIRED, 401);

  const { planId } = await context.params;
  if (!isAccountPlanId(planId)) return jsonError(BAD_REQUEST, 400);

  const result = await deleteMyPlanMzkRoute(user.sessionToken, planId);
  if (!result.ok) return jsonError(result.error, result.status);
  return NextResponse.json({ plans: result.user.plans });
}
