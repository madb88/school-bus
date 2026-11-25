import { NextResponse } from "next/server";
import {
  deleteMyMzkRoute,
  putMyMzkRoute,
  type BackendMzkRoute,
} from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/auth/http";
import {
  hasConfiguredMzkRoute,
  parseMzkRoutePreference,
} from "@/lib/mzk/route-storage";
import { parseSchoolEntityId } from "@/lib/schools/storage";

export const runtime = "nodejs";

const LOGIN_REQUIRED = "Zaloguj się, żeby zapisać trasę MZK na koncie.";
const BAD_REQUEST = "Niepoprawne żądanie.";

function schoolIdFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return parseSchoolEntityId(url.searchParams.get("schoolId"));
}

function parseRouteBody(body: unknown): BackendMzkRoute | null {
  const pref = parseMzkRoutePreference(body);
  if (!hasConfiguredMzkRoute(pref) || !pref.boardStopId || !pref.alightStopId) {
    return null;
  }
  if (pref.boardStopId === pref.alightStopId) return null;
  const route: BackendMzkRoute = {
    boardStopId: pref.boardStopId,
    alightStopId: pref.alightStopId,
  };
  if (pref.route) route.route = pref.route;
  return route;
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(LOGIN_REQUIRED, 401);

  const schoolId = schoolIdFromRequest(request);
  if (!schoolId) return jsonError(BAD_REQUEST, 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(BAD_REQUEST, 400);
  }

  const route = parseRouteBody(body);
  if (!route) return jsonError(BAD_REQUEST, 400);

  const result = await putMyMzkRoute(user.sessionToken, schoolId, route);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json({
    mzkRoutes: result.user.mzkRoutes,
    route: result.user.mzkRoutes[schoolId] ?? null,
  });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(LOGIN_REQUIRED, 401);

  const schoolId = schoolIdFromRequest(request);
  if (!schoolId) return jsonError(BAD_REQUEST, 400);

  const result = await deleteMyMzkRoute(user.sessionToken, schoolId);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json({
    mzkRoutes: result.user.mzkRoutes,
    route: null,
  });
}
