import webpush from "web-push";
import type { StoredSubscription } from "./store";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

export type SendResult = "ok" | "gone" | "failed" | "unconfigured";

let configured = false;

function configureWebPush(): boolean {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function pushIsConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

export async function sendPush(
  subscription: StoredSubscription,
  payload: PushPayload,
): Promise<SendResult> {
  if (!configureWebPush()) return "unconfigured";

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return "ok";
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number(error.statusCode)
        : 0;
    if (statusCode === 404 || statusCode === 410) return "gone";
    console.error("Push send failed", error);
    return "failed";
  }
}
