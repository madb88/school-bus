import { NextResponse } from "next/server";
import {
  getPushRecord,
  getPushRedis,
  parseStoredPlan,
  parseSubscription,
  savePushRecord,
  subscriptionId,
} from "@/lib/push/store";

export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json(
    { error: "Powiadomienia wymagają skonfigurowanego Redis." },
    { status: 503 },
  );
}

export async function PUT(request: Request) {
  if (!getPushRedis()) return unavailable();

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

  await savePushRecord({
    ...existing,
    subscription,
    plan: parseStoredPlan(record.plan),
  });

  return NextResponse.json({ ok: true });
}
