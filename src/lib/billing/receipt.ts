import { Resend } from "resend";
import { formatPolishYmd } from "./school-year";

export const PLUS_RECEIPT_SUBJECT = "Potwierdzenie zakupu Planu Plus – Autobus Szkolny";
export const PLUS_RENEWAL_SUBJECT = "Potwierdzenie przedłużenia Planu Plus – Autobus Szkolny";

const PLUS_SITE_URL = "https://www.autobusszkolny.pl";

export function plusPurchaseEmailText(input: {
  startedOn: string;
  endsOn: string;
  renewal?: boolean;
}): string | null {
  const started = formatPolishYmd(input.startedOn);
  const ends = formatPolishYmd(input.endsOn);
  if (!started || !ends) return null;
  const intro = input.renewal
    ? "potwierdzamy przedłużenie Planu Plus w serwisie Autobus Szkolny. Dotychczasowy dostęp został wydłużony."
    : "potwierdzamy zawarcie umowy dotyczącej korzystania z Planu Plus w serwisie Autobus Szkolny.";
  const startedLine = input.renewal
    ? `Data przedłużenia: ${started}`
    : `Data rozpoczęcia świadczenia usługi: ${started}`;
  const accessLine = input.renewal
    ? "Przedłużenie zostało doliczone do aktualnego okresu dostępu."
    : "Usługa została uruchomiona od razu po dokonaniu płatności.";
  return [
    "Dzień dobry,",
    "",
    intro,
    "",
    input.renewal ? "Szczegóły przedłużenia:" : "Szczegóły zakupu:",
    "",
    "Plan: Plan Plus",
    ...(input.renewal ? ["Rodzaj: przedłużenie"] : []),
    "Okres dostępu: 12 miesięcy",
    "Cena: 30,00 zł",
    "Sposób płatności: płatność jednorazowa",
    startedLine,
    `Data zakończenia dostępu: ${ends}`,
    "",
    accessLine,
    "",
    "Zgodnie z udzieloną przez Ciebie zgodą na rozpoczęcie świadczenia usługi przed upływem 14 dni od zawarcia umowy, po rozpoczęciu świadczenia utraciłeś/utraciłaś prawo odstąpienia od umowy.",
    "",
    "Regulamin serwisu oraz informacje dotyczące Planu Plus są dostępne w serwisie:",
    "",
    "Autobus Szkolny",
    PLUS_SITE_URL,
    "",
    "Pozdrawiamy,",
    "Autobus Szkolny",
  ].join("\n");
}

function verifiedAddress(from: string): string | null {
  const match = from.match(/<([^>]+)>/);
  const address = (match?.[1] ?? from).trim();
  if (!address.includes("@")) return null;
  return address;
}

/** Confirmation to the buyer. The address is the account that paid, never the operator inbox. */
export async function sendPlusPurchaseEmail(input: {
  to: string;
  startedOn: string;
  endsOn: string;
  renewal?: boolean;
}): Promise<boolean> {
  const text = plusPurchaseEmailText(input);
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.FEEDBACK_FROM_EMAIL?.trim();
  const address = from ? verifiedAddress(from) : null;
  if (!text || !apiKey || !address) return false;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: `Autobus Szkolny <${address}>`,
    to: [input.to],
    subject: input.renewal ? PLUS_RENEWAL_SUBJECT : PLUS_RECEIPT_SUBJECT,
    text,
  });
  if (error) {
    console.error("Plan Plus receipt email failed");
    return false;
  }
  return true;
}
