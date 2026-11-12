import { NextResponse } from "next/server";
import { updateMySettings } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/auth/http";
import { parseSchoolEntityId } from "@/lib/schools/storage";

export const runtime = "nodejs";

const LOGIN_REQUIRED = "Zaloguj się, żeby zapisać ustawienia.";
const BAD_REQUEST = "Niepoprawne żądanie.";

export async function PATCH(request: Request) {
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
  if (!record) return jsonError(BAD_REQUEST, 400);

  const defaultCityId =
    record.defaultCityId === undefined
      ? undefined
      : record.defaultCityId === null || record.defaultCityId === ""
        ? null
        : parseSchoolEntityId(
            typeof record.defaultCityId === "string"
              ? record.defaultCityId
              : null,
          );
  const defaultSchoolId =
    record.defaultSchoolId === undefined
      ? undefined
      : record.defaultSchoolId === null || record.defaultSchoolId === ""
        ? null
        : parseSchoolEntityId(
            typeof record.defaultSchoolId === "string"
              ? record.defaultSchoolId
              : null,
          );

  if (record.defaultCityId !== undefined && defaultCityId === undefined) {
    return jsonError(BAD_REQUEST, 400);
  }
  if (record.defaultSchoolId !== undefined && defaultSchoolId === undefined) {
    return jsonError(BAD_REQUEST, 400);
  }

  const result = await updateMySettings(user.sessionToken, {
    defaultCityId: defaultCityId ?? null,
    defaultSchoolId: defaultSchoolId ?? null,
  });
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json({ settings: result.user.settings });
}
