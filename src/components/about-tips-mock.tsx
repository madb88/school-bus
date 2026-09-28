import type { LucideIcon } from "lucide-react";
import { Bell, Printer, QrCode, Share2, Smartphone, SunMoon } from "lucide-react";

const tips: ReadonlyArray<{
  icon: LucideIcon;
  title: string;
  body: string;
}> = [
  {
    icon: Smartphone,
    title: "Aplikacja na telefonie",
    body: "Dodaj autobusszkolny do ekranu głównego i korzystaj jak z aplikacji.",
  },
  {
    icon: Bell,
    title: "Powiadomienia",
    body: "Wkrótce przypomnienia o zaplanowanych przejazdach.",
  },
  {
    icon: Share2,
    title: "Udostępnij rozkład",
    body: "Skopiuj link z wybranymi ustawieniami i wyślij bliskim.",
  },
  {
    icon: QrCode,
    title: "Przenieś plan",
    body: "Przenieś ustawienia na inne urządzenie kodem QR.",
  },
  {
    icon: Printer,
    title: "Szybki wydruk",
    body: "Jedna kartka z tygodniem dojazdów — bez sprawdzania telefonu.",
  },
  {
    icon: SunMoon,
    title: "Jasny lub ciemny",
    body: "Wybierz motyw w nagłówku strony.",
  },
];

/** Decorative mini panel of everyday convenience features. */
export function AboutTipsMock() {
  return (
    <ul
      aria-hidden
      className="grid w-full min-w-0 gap-2 sm:grid-cols-2"
    >
      {tips.map((tip) => {
        const Icon = tip.icon;
        return (
          <li
            key={tip.title}
            className="flex gap-3 rounded-xl border border-border/70 bg-card/80 px-3 py-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-bus">
              <Icon className="size-4" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{tip.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {tip.body}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
