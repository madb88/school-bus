import { Receiver } from "@upstash/qstash";
import { NextResponse } from "next/server";
import { dispatchReminders } from "@/lib/push/dispatch";
import { pushIsConfigured } from "@/lib/push/send";
import { getPushRedis } from "@/lib/push/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY?.trim();
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY?.trim();
  if (!currentSigningKey || !nextSigningKey || !getPushRedis() || !pushIsConfigured()) {
    return NextResponse.json(
      { error: "Wysyłka powiadomień nie jest skonfigurowana." },
      { status: 503 },
    );
  }

  const body = await request.text();
  const signature = request.headers.get("upstash-signature") ?? "";
  const receiver = new Receiver({ currentSigningKey, nextSigningKey });

  try {
    const valid = await receiver.verify({ signature, body });
    if (!valid) {
      return NextResponse.json({ error: "Niepoprawny podpis." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Niepoprawny podpis." }, { status: 401 });
  }

  const summary = await dispatchReminders();
  return NextResponse.json(summary);
}
