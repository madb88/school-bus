import { NextResponse } from "next/server";
import {
  PUSH_NOT_YOURS,
  pushOwnedBy,
  requirePlusPush,
  type PushAccess,
} from "@/lib/push/access";
import { parsePushKinds } from "@/lib/push/kinds";
import {
  getPushRecord,
  getPushRedis,
  parseSubscription,
  savePushRecord,
  subscriptionId,
} from "@/lib/push/store";

export const runtime = "nodejs";

function denied(access: Extract<PushAccess, { ok: false }>) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}

export async function PUT(request: Request) {
  if (!getPushRedis()) {
    return NextResponse.json(
      { error: "Powiadomienia wymagają skonfigurowanego Redis." },
      { status: 503 },
    );
  }

  const access = await requirePlusPush();
  if (!access.ok) return denied(access);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Niepoprawne żądanie." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Niepoprawne żądanie." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const subscription = parseSubscription(record.subscription);
  if (!subscription) {
    return NextResponse.json({ error: "Niepoprawne żądanie." }, { status: 400 });
  }

  const id = subscriptionId(subscription.endpoint);
  const existing = await getPushRecord(id);
  if (!existing || existing.subscription.keys.auth !== subscription.keys.auth) {
    return NextResponse.json({ error: "Brak subskrypcji." }, { status: 404 });
  }
  if (!pushOwnedBy(existing.userId, access.userId)) {
    return NextResponse.json({ error: PUSH_NOT_YOURS }, { status: 403 });
  }

  await savePushRecord({
    ...existing,
    subscription,
    kinds: parsePushKinds(record.kinds),
    userId: access.userId,
  });

  return NextResponse.json({ ok: true });
}
