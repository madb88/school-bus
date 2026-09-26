import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Bus,
  CalendarClock,
  MessageSquare,
  Printer,
  QrCode,
  Share2,
  SunMoon,
} from "lucide-react";
import type { ReactNode } from "react";
import { AboutPrintMock } from "@/components/about-print-mock";
import { buttonVariants } from "@/components/ui/button";

type GuideTip = {
  icon: LucideIcon;
  title: string;
  body: ReactNode;
};

type GuideStep = {
  number: string;
  icon: LucideIcon;
  title: string;
  body: ReactNode;
  href?: string;
  cta?: string;
  visual?: "print";
  tips?: GuideTip[];
};

const steps: GuideStep[] = [
  {
    number: "1",
    icon: BookOpen,
    title: "Ustaw plan lekcji",
    body: (
      <>
        <p>
          Wejdź w{" "}
          <span className="font-medium text-foreground">Plan lekcji</span> i
          wpisz godziny lekcji od poniedziałku do piątku.
        </p>
        <p>
          Wybierz swoją miejscowość lub przystanek i podaj, o której zaczynają
          i kończą się lekcje.
        </p>
        <p>Gotowe? Zapisz plan.</p>
        <p>
          Od tej pory rozkład będzie mógł automatycznie dopasować autobusy do
          godzin lekcji dziecka.
        </p>
      </>
    ),
    href: "/lekcje",
    cta: "Przejdź do planu lekcji",
  },
  {
    number: "2",
    icon: Printer,
    title: "Wydrukuj tygodniowy plan dojazdów",
    body: (
      <>
        <p>Nie chcesz za każdym razem sprawdzać telefonu?</p>
        <p>
          Po ustawieniu planu lekcji możesz wydrukować jedną kartkę z całym
          tygodniem — z godziną lekcji oraz wyjazdu i powrotu autobusu
          szkolnego.
        </p>
        <p>Możesz też dodać najbliższe kursy MZK.</p>
        <p>Wydrukuj, powieś w domu i gotowe.</p>
      </>
    ),
    href: "/lekcje",
    cta: "Drukuj z planu lekcji",
    visual: "print",
  },
  {
    number: "3",
    icon: Bus,
    title: "Dodaj trasę MZK",
    body: (
      <>
        <p>
          Jeśli dziecko korzysta również z komunikacji miejskiej, możesz dodać
          swoją trasę MZK.
        </p>
        <p>
          W zakładce <span className="font-medium text-foreground">MZK</span>{" "}
          wybierz przystanek, z którego dziecko wsiada, i ten, na którym
          wysiada. Możesz też podać numer linii.
        </p>
        <p>
          Po zapisaniu trasy zobaczysz autobusy szkolne i pasujące kursy MZK w
          jednym rozkładzie (wybierz{" "}
          <span className="font-medium text-foreground">Szkolny + MZK</span>).
        </p>
        <p>
          Nie musisz ustawiać trasy powrotnej — przejazdy ze szkoły korzystają z
          trasy w odwrotnym kierunku.
        </p>
      </>
    ),
    href: "/mzk",
    cta: "Przejdź do trasy MZK",
  },
  {
    number: "4",
    icon: CalendarClock,
    title: "Sprawdź dzisiejszy rozkład",
    body: (
      <>
        <p>
          Przejdź do{" "}
          <span className="font-medium text-foreground">Rozkładu</span> i
          wybierz:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">Szkolny</span> albo{" "}
            <span className="font-medium text-foreground">Szkolny + MZK</span>
          </li>
          <li>dzień,</li>
          <li>miejsce,</li>
          <li>
            kierunek:{" "}
            <span className="font-medium text-foreground">Do szkoły</span> lub{" "}
            <span className="font-medium text-foreground">Ze szkoły</span>.
          </li>
        </ul>
        <p>
          Jeśli masz zapisany plan lekcji, włącz{" "}
          <span className="font-medium text-foreground">Do planu lekcji</span>.
        </p>
        <p>
          Chcesz sprawdzić tylko dzisiejsze kursy? Wybierz{" "}
          <span className="font-medium text-foreground">Dziś</span> i przejdź od
          razu do{" "}
          <span className="font-medium text-foreground">Najbliższego kursu</span>
          .
        </p>
      </>
    ),
    href: "/",
    cta: "Otwórz rozkład",
  },
  {
    number: "5",
    icon: Share2,
    title: "Przydatne na co dzień",
    body: null,
    tips: [
      {
        icon: Share2,
        title: "Udostępnij rozkład",
        body: (
          <>
            Możesz wysłać komuś link do rozkładu z wybranymi ustawieniami
            (przycisk{" "}
            <span className="font-medium text-foreground">Kopiuj link</span>).
          </>
        ),
      },
      {
        icon: QrCode,
        title: "Przenieś plan na telefon",
        body: (
          <>
            Masz już ustawiony plan na komputerze? Możesz przenieść go na telefon
            lub inne urządzenie za pomocą kodu QR.
          </>
        ),
      },
      {
        icon: Bell,
        title: "Powiadomienia",
        body: (
          <>
            Włącz powiadomienia, a otrzymasz przypomnienia dotyczące
            zaplanowanych przejazdów.
          </>
        ),
      },
      {
        icon: SunMoon,
        title: "Jasny lub ciemny wygląd",
        body: (
          <>Wybierz wygodny dla siebie motyw w nagłówku strony.</>
        ),
      },
      {
        icon: MessageSquare,
        title: "Masz pomysł?",
        body: (
          <>
            Napisz nam, co możemy poprawić. Przycisk{" "}
            <span className="font-medium text-foreground">Opinia</span> znajdziesz
            w rogu ekranu.
          </>
        ),
      },
    ],
  },
];

export function AboutGuide() {
  return (
    <ol className="space-y-4 sm:space-y-5">
      {steps.map((step) => {
        const StepIcon = step.icon;
        return (
          <li
            key={step.number}
            className="grid gap-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[0_12px_40px_-24px_color-mix(in_srgb,var(--foreground)_40%,transparent)] dark:shadow-[0_10px_28px_-22px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:grid-cols-[auto_1fr] sm:gap-5 sm:p-6"
          >
            <span
              aria-hidden
              className="font-display text-3xl font-bold tabular-nums text-bus/80 sm:pt-0.5 sm:text-4xl"
            >
              {step.number}
            </span>
            <div className="min-w-0 space-y-3">
              <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight text-asphalt sm:text-2xl">
                <StepIcon
                  aria-hidden
                  className="size-5 shrink-0 text-bus sm:size-6"
                  strokeWidth={2}
                />
                {step.title}
              </h2>
              {step.body ? (
                <div className="max-w-2xl space-y-3 text-base leading-relaxed text-muted-foreground">
                  {step.body}
                </div>
              ) : null}
              {step.tips ? (
                <ul className="max-w-2xl space-y-4">
                  {step.tips.map((tip) => {
                    const TipIcon = tip.icon;
                    return (
                      <li key={tip.title} className="flex gap-3">
                        <TipIcon
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-bus"
                          strokeWidth={2}
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium text-foreground">
                            {tip.title}
                          </p>
                          <p className="text-base leading-relaxed text-muted-foreground">
                            {tip.body}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {step.visual === "print" ? (
                <div className="max-w-lg pt-1">
                  <AboutPrintMock />
                </div>
              ) : null}
              {step.href ? (
                <div className="pt-1">
                  <Link
                    href={step.href}
                    className={buttonVariants({
                      size: "sm",
                      variant: "secondary",
                    })}
                  >
                    {step.cta}
                  </Link>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
