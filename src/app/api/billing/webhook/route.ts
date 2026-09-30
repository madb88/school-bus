import { NextResponse } from "next/server";
import { readStripeWebhookConfig } from "@/lib/billing/config";
import { getBillingKv } from "@/lib/billing/store";
import { handleStripeWebhook } from "@/lib/billing/webhook";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_000_000;

function json(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return null;
  return raw;
}

/** Stripe → entitlement. The signature is verified before any write. */
export async function POST(request: Request) {
  const raw = await readBody(request);
  if (raw == null) return json("Payload too large", 413);

  const config = readStripeWebhookConfig();
  if (!config) return json("Unavailable", 503);

  const result = await handleStripeWebhook({
    rawBody: raw,
    signature: request.headers.get("stripe-signature"),
    secret: config.webhookSecret,
    priceId: config.priceId,
    apiKey: config.secretKey,
    kv: getBillingKv(),
  });

  if (!result.ok) {
    if (result.status === 401) return json("Unauthorized", 401);
    if (result.status === 400) return json("Bad request", 400);
    return json("Unavailable", result.status);
  }
  return NextResponse.json({ ok: true });
}
