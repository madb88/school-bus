"use server";

import { headers } from "next/headers";
import { checkFeedbackRateLimit } from "@/lib/feedback/rate-limit";
import { sendFeedbackEmail } from "@/lib/feedback/send-email";
import { verifyTurnstileToken } from "@/lib/feedback/turnstile";

const MESSAGE_MAX = 2000;
const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FeedbackState = {
  ok: boolean;
  message: string;
};

function getClientIp(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerStore.get("x-real-ip")?.trim() || "unknown";
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const honeypot = readString(formData, "website");
  if (honeypot) {
    return { ok: true, message: "Dziękujemy za opinię." };
  }

  const message = readString(formData, "message");
  const replyTo = readString(formData, "email");
  const turnstileToken = readString(formData, "cf-turnstile-response");

  if (!message) {
    return { ok: false, message: "Napisz krótką treść opinii." };
  }

  if (message.length > MESSAGE_MAX) {
    return {
      ok: false,
      message: `Wiadomość może mieć najwyżej ${MESSAGE_MAX} znaków.`,
    };
  }

  if (replyTo) {
    if (replyTo.length > EMAIL_MAX || !EMAIL_RE.test(replyTo)) {
      return { ok: false, message: "Podaj poprawny adres e-mail lub zostaw pole puste." };
    }
  }

  const headerStore = await headers();
  const ip = getClientIp(headerStore);

  const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
  if (!turnstileOk) {
    return {
      ok: false,
      message: "Nie udało się zweryfikować formularza. Odśwież stronę i spróbuj ponownie.",
    };
  }

  const rate = checkFeedbackRateLimit(ip);
  if (!rate.ok) {
    return {
      ok: false,
      message: "Wysłano zbyt wiele opinii. Spróbuj ponownie za chwilę.",
    };
  }

  const result = await sendFeedbackEmail({
    message,
    replyTo: replyTo || undefined,
  });

  if (!result.ok) {
    return { ok: false, message: result.error };
  }

  return { ok: true, message: "Dziękujemy za opinię." };
}
