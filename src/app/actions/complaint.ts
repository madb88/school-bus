"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { checkComplaintRateLimit } from "@/lib/billing/rate-limit";
import { loadPlusPanel } from "@/lib/billing/status";
import { sendComplaintEmail } from "@/lib/feedback/send-email";

const MESSAGE_MAX = 2000;

export type ComplaintState = {
  ok: boolean;
  message: string;
};

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendComplaint(
  _prev: ComplaintState,
  formData: FormData,
): Promise<ComplaintState> {
  if (readString(formData, "website")) {
    return { ok: true, message: "Reklamacja wysłana." };
  }

  const message = readString(formData, "message");
  if (!message) {
    return { ok: false, message: "Opisz reklamację." };
  }
  if (message.length > MESSAGE_MAX) {
    return {
      ok: false,
      message: `Opis może mieć najwyżej ${MESSAGE_MAX} znaków.`,
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, message: "Zaloguj się, żeby wysłać reklamację." };
  }

  const plus = await loadPlusPanel(user.userId, false);
  if (plus.state === "unknown") {
    return {
      ok: false,
      message: "Nie udało się sprawdzić Planu Plus. Odśwież stronę i spróbuj ponownie.",
    };
  }
  if (plus.state !== "active") {
    return {
      ok: false,
      message: "Reklamację można wysłać tylko przy aktywnym Planie Plus.",
    };
  }

  const rate = await checkComplaintRateLimit(user.userId);
  if (!rate.ok) {
    return {
      ok: false,
      message: "Wysłano zbyt wiele reklamacji. Spróbuj ponownie za chwilę.",
    };
  }

  const result = await sendComplaintEmail({
    message,
    accountEmail: user.email,
  });
  if (!result.ok) return { ok: false, message: result.error };
  return { ok: true, message: "Reklamacja wysłana." };
}
