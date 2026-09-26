import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { parseLessonPlan } from "@/lib/child-schedule/storage";
import type { ChildLessonPlan } from "@/lib/child-schedule/types";
import { parsePushKinds, type PushKinds } from "./kinds";

const INDEX_KEY = "school-bus:push:index";
const LOCK_KEY = "school-bus:push:lock";
const PREFIX = "school-bus:push:";

export type StoredSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushRecord = {
  subscription: StoredSubscription;
  plan: ChildLessonPlan;
  sentOn: string;
  sent: string[];
  /** Timetable content last seen for this device. Empty until the first check. */
  scheduleFingerprint: string;
  kinds: PushKinds;
};

let redisClient: Redis | null | undefined;

export function getPushRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function subscriptionId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export function parseSubscription(raw: unknown): StoredSubscription | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.endpoint !== "string" || !record.endpoint.startsWith("https://")) {
    return null;
  }

  const keys = record.keys;
  if (!keys || typeof keys !== "object") return null;
  const keyRecord = keys as Record<string, unknown>;
  if (typeof keyRecord.p256dh !== "string" || typeof keyRecord.auth !== "string") {
    return null;
  }
  if (!keyRecord.p256dh || !keyRecord.auth) return null;

  return {
    endpoint: record.endpoint,
    keys: { p256dh: keyRecord.p256dh, auth: keyRecord.auth },
  };
}

export function parseStoredPlan(raw: unknown): ChildLessonPlan {
  return parseLessonPlan(raw);
}

function recordKey(id: string): string {
  return `${PREFIX}${id}`;
}

function isPushRecord(value: unknown): value is PushRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    parseSubscription(record.subscription) !== null &&
    Array.isArray(record.sent) &&
    typeof record.sentOn === "string"
  );
}

export async function getPushRecord(id: string): Promise<PushRecord | null> {
  const redis = getPushRedis();
  if (!redis) return null;
  const value = await redis.get<unknown>(recordKey(id));
  if (!isPushRecord(value)) return null;
  return {
    subscription: parseSubscription(value.subscription)!,
    plan: parseStoredPlan(value.plan),
    sentOn: value.sentOn,
    sent: value.sent.filter((item): item is string => typeof item === "string"),
    scheduleFingerprint:
      typeof value.scheduleFingerprint === "string"
        ? value.scheduleFingerprint
        : "",
    kinds: parsePushKinds(
      "kinds" in value ? (value as { kinds?: unknown }).kinds : undefined,
    ),
  };
}

export async function savePushRecord(record: PushRecord): Promise<void> {
  const redis = getPushRedis();
  if (!redis) throw new Error("Redis is not configured");
  const id = subscriptionId(record.subscription.endpoint);
  await redis.set(recordKey(id), record);
  await redis.sadd(INDEX_KEY, id);
}

export async function deletePushRecord(id: string): Promise<void> {
  const redis = getPushRedis();
  if (!redis) return;
  await redis.del(recordKey(id));
  await redis.srem(INDEX_KEY, id);
}

export async function listPushRecords(): Promise<PushRecord[]> {
  const redis = getPushRedis();
  if (!redis) return [];
  const ids = await redis.smembers(INDEX_KEY);
  if (!ids.length) return [];

  const records = await Promise.all(ids.map((id) => getPushRecord(id)));
  return records.filter((record): record is PushRecord => record !== null);
}

/** Returns false when another dispatcher run already holds the lock. */
export async function acquireDispatchLock(): Promise<boolean> {
  const redis = getPushRedis();
  if (!redis) return false;
  const result = await redis.set(LOCK_KEY, "1", { nx: true, ex: 60 });
  return result === "OK";
}

export async function releaseDispatchLock(): Promise<void> {
  const redis = getPushRedis();
  if (!redis) return;
  await redis.del(LOCK_KEY);
}
