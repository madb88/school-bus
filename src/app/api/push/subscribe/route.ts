import { NextResponse } from "next/server";
import { hasConfiguredLessons } from "@/lib/child-schedule/storage";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import { loadScheduleSnapshot } from "@/lib/dowozy/load-schedule";
import { parsePushKinds } from "@/lib/push/kinds";
import { schoolScheduleFingerprint } from "@/lib/push/schedule-fingerprint";
import { sendPush } from "@/lib/push/send";
import {
  deletePushRecord,
  getPushRecord,
  getPushRedis,
  parseStoredPlan,
  parseSubscription,
  savePushRecord,
  subscriptionId,
} from "@/lib/push/store";

export const runtime = "nodejs";

const CONFIRMATION = {
  title: "Powiadomienia włączone",
  body: "Przypomnienie przyjdzie około 20 minut przed odjazdem do szkoły i przed autobusem powrotnym. Dostaniesz też wiadomość, gdy zmieni się rozkład.",
  url: "/",
};

function unavailable() {
  return NextResponse.json(
    { error: "Powiadomienia wymagają skonfigurowanego Redis." },
    { status: 503 },
  );
}

function invalidBody() {
  return NextResponse.json({ error: "Niepoprawne żądanie." }, { status: 400 });
}

async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function readPlan(body: Record<string, unknown>): ChildLessonPlan {
  return parseStoredPlan(body.plan);
}

export async function POST(request: Request) {
  if (!getPushRedis()) return unavailable();

  const body = await readJson(request);
  if (!body || typeof body !== "object") return invalidBody();
  const record = body as Record<string, unknown>;
  const subscription = parseSubscription(record.subscription);
  if (!subscription) return invalidBody();

  const plan = readPlan(record);
  if (!plan.place || !hasConfiguredLessons(plan)) {
    return NextResponse.json(
      { error: "Ustaw miejsce i godziny w planie lekcji." },
      { status: 400 },
    );
  }

  const id = subscriptionId(subscription.endpoint);
  const existing = await getPushRecord(id);
  const schedule = existing?.scheduleFingerprint
    ? null
    : await loadScheduleSnapshot();
  await savePushRecord({
    subscription,
    plan,
    sentOn: existing?.sentOn ?? "",
    sent: existing?.sent ?? [],
    scheduleFingerprint:
      existing?.scheduleFingerprint ||
      (schedule ? schoolScheduleFingerprint(schedule) : ""),
    kinds:
      record.kinds !== undefined
        ? parsePushKinds(record.kinds)
        : (existing?.kinds ?? parsePushKinds(undefined)),
  });

  if (!existing) {
    await sendPush(subscription, CONFIRMATION);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!getPushRedis()) return unavailable();

  const body = await readJson(request);
  if (!body || typeof body !== "object") return invalidBody();
  const subscription = parseSubscription(
    (body as Record<string, unknown>).subscription,
  );
  if (!subscription) return invalidBody();

  const id = subscriptionId(subscription.endpoint);
  const existing = await getPushRecord(id);
  if (existing && existing.subscription.keys.auth === subscription.keys.auth) {
    await deletePushRecord(id);
  }

  return NextResponse.json({ ok: true });
}
