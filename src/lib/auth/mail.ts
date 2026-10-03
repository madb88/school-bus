import { Resend } from "resend";
import { siteName } from "@/lib/site-metadata";

export function isMagicLinkMailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.FEEDBACK_FROM_EMAIL?.trim(),
  );
}

/** Same verified address as feedback, with a login display name. */
export function magicLinkFromAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  const address = (match?.[1] ?? from).trim();
  return `Logowanie <${address}>`;
}

export function magicLinkEmailText(input: { url: string; code: string }): string {
  return [
    `Zaloguj się do ${siteName}`,
    "",
    "Otwórz ten link w tej samej przeglądarce:",
    input.url,
    "",
    `Albo wpisz kod: ${input.code}`,
    "",
    "Link i kod działają 15 minut i tylko raz.",
    "Wpisz kod w aplikacji z ekranu głównego na tym urządzeniu. Link z maila otwiera przeglądarkę, a to osobne logowanie.",
  ].join("\n");
}

export async function sendMagicLinkEmail(input: {
  to: string;
  url: string;
  code: string;
}): Promise<{ ok: true } | { ok: false }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.FEEDBACK_FROM_EMAIL?.trim();
  if (!apiKey || !from) return { ok: false };

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: magicLinkFromAddress(from),
    to: [input.to],
    subject: `Logowanie — ${siteName}`,
    text: magicLinkEmailText(input),
  });

  if (error) {
    console.error("Magic link email failed");
    return { ok: false };
  }

  return { ok: true };
}
