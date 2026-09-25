import { NextResponse } from "next/server";
import { pushIsConfigured, sendPush } from "@/lib/push/send";
import { parseSubscription } from "@/lib/push/store";

export const runtime = "nodejs";

const TEST_PAYLOAD = {
  title: "Dojazdy do szkoły",
  body: "Powiadomienie testowe. Jeśli je widzisz, push działa.",
  url: "/instalacja",
};

export async function POST(request: Request) {
  if (!pushIsConfigured()) {
    return NextResponse.json(
      { error: "Powiadomienia nie są jeszcze skonfigurowane." },
      { status: 503 },
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
