import { NextResponse } from "next/server";
import {
  PUSH_NOT_YOURS,
  pushOwnedBy,
  requirePlusPush,
  type PushAccess,
} from "@/lib/push/access";
import {
  checkPushTestRateLimit,
  getClientIpFromHeaders,
} from "@/lib/push/rate-limit";
import { pushIsConfigured, sendPush } from "@/lib/push/send";
import { getPushRecord, parseSubscription, subscriptionId } from "@/lib/push/store";

export const runtime = "nodejs";

function denied(access: Extract<PushAccess, { ok: false }>) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}

const TEST_PAYLOAD = {
  title: "Odjazd do szkoły za 20 min",
  body: "Osiedle Słoneczne · 7:12",
  url: "/",
};

export async function POST(request: Request) {
  if (!pushIsConfigured()) {
    return NextResponse.json(
      { error: "Powiadomienia nie są jeszcze skonfigurowane." },
      { status: 503 },
    );
  }

  const ip = getClientIpFromHeaders(request.headers);
  const rate = await checkPushTestRateLimit(ip);
  if (!rate.ok) {
    const headers =
      rate.retryAfterSec != null
        ? { "Retry-After": String(rate.retryAfterSec) }
        : undefined;
    return NextResponse.json(
      { error: "Zbyt wiele prób. Spróbuj ponownie za chwilę." },
      { status: 429, headers },
    );
  }

  const access = await requirePlusPush();
  if (!access.ok) return denied(access);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Niepoprawne żądanie." }, { status: 400 });
  }

  const subscription = parseSubscription(
    (body as Record<string, unknown>).subscription,
  );
  if (!subscription) {
    return NextResponse.json({ error: "Niepoprawne żądanie." }, { status: 400 });
  }

  const existing = await getPushRecord(subscriptionId(subscription.endpoint));
  if (
    existing &&
    (existing.subscription.keys.auth !== subscription.keys.auth ||
      !pushOwnedBy(existing.userId, access.userId))
  ) {
    return NextResponse.json({ error: PUSH_NOT_YOURS }, { status: 403 });
  }

  const result = await sendPush(subscription, TEST_PAYLOAD);
  if (result !== "ok") {
    return NextResponse.json(
      { error: "Nie udało się wysłać powiadomienia testowego." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
