import { Resend } from "resend";

type SendFeedbackEmailInput = {
  message: string;
  replyTo?: string;
};

export async function sendFeedbackEmail({
  message,
  replyTo,
}: SendFeedbackEmailInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  const from = process.env.FEEDBACK_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    return {
      ok: false,
      error: "Brak konfiguracji wysyłki wiadomości.",
    };
  }

  const resend = new Resend(apiKey);
  const text = [
    "Nowa opinia z aplikacji Dojazdy do szkoły",
    "",
    message,
    "",
    replyTo ? `Odpowiedź do: ${replyTo}` : "Brak adresu zwrotnego.",
  ].join("\n");

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: "Opinia — Dojazdy do szkoły",
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    return { ok: false, error: "Nie udało się wysłać wiadomości. Spróbuj później." };
  }

  return { ok: true };
}
