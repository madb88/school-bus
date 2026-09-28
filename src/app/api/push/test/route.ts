import { NextResponse } from "next/server";
import {
  checkPushTestRateLimit,
  getClientIpFromHeaders,
} from "@/lib/push/rate-limit";
import { pushIsConfigured, sendPush } from "@/lib/push/send";
import { parseSubscription } from "@/lib/push/store";

export const runtime = "nodejs";

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

  const result = await sendPush(subscription, TEST_PAYLOAD);
  if (result !== "ok") {
    return NextResponse.json(
      { error: "Nie udało się wysłać powiadomienia testowego." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
