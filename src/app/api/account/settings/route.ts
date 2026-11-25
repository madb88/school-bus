import { NextResponse } from "next/server";
import { updateMySettings } from "@/lib/auth/backend";
import { getCurrentUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/auth/http";
import { MAX_VISIBLE_SCHOOLS } from "@/lib/schools/constants";
import { parseSchoolEntityId } from "@/lib/schools/storage";

export const runtime = "nodejs";

const LOGIN_REQUIRED = "Zaloguj się, żeby zapisać ustawienia.";
const BAD_REQUEST = "Niepoprawne żądanie.";
const TOO_MANY_VISIBLE = `Możesz wybrać najwyżej ${MAX_VISIBLE_SCHOOLS} szkół.`;

function parseOptionalEntityId(
  value: unknown,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  return parseSchoolEntityId(value);
}

function parseVisibleSchoolIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const id = parseSchoolEntityId(item);
    if (!id) return null;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

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

  const patch: {
    defaultCityId?: string | null;
    defaultSchoolId?: string | null;
    visibleSchoolIds?: string[];
  } = {};

  if (record.defaultCityId !== undefined) {
    const defaultCityId = parseOptionalEntityId(record.defaultCityId);
    // Non-empty but invalid UUID → parseSchoolEntityId returns null; reject.
    if (
      record.defaultCityId !== null &&
      record.defaultCityId !== "" &&
      defaultCityId === null
    ) {
      return jsonError(BAD_REQUEST, 400);
    }
    patch.defaultCityId = defaultCityId ?? null;
  }

  if (record.defaultSchoolId !== undefined) {
    const defaultSchoolId = parseOptionalEntityId(record.defaultSchoolId);
    if (
      record.defaultSchoolId !== null &&
      record.defaultSchoolId !== "" &&
      defaultSchoolId === null
    ) {
      return jsonError(BAD_REQUEST, 400);
    }
    patch.defaultSchoolId = defaultSchoolId ?? null;
  }

  if (record.visibleSchoolIds !== undefined) {
    const visibleSchoolIds = parseVisibleSchoolIds(record.visibleSchoolIds);
    if (!visibleSchoolIds) return jsonError(BAD_REQUEST, 400);
    if (visibleSchoolIds.length > MAX_VISIBLE_SCHOOLS) {
      return jsonError(TOO_MANY_VISIBLE, 400);
    }
    patch.visibleSchoolIds = visibleSchoolIds;
  }

  if (Object.keys(patch).length === 0) {
    return jsonError(BAD_REQUEST, 400);
  }

  const result = await updateMySettings(user.sessionToken, patch);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }
  return NextResponse.json({ settings: result.user.settings });
}
