import Link from "next/link";
import type { ReactNode } from "react";
import { AboutPrintMock } from "@/components/about-print-mock";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

type GuideStep = {
  number: string;
  title: string;
  body: ReactNode;
  href?: string;
  cta?: string;
  visual?: "print";
};

const steps: GuideStep[] = [
  {
    number: "1",
    title: "Ustaw plan lekcji",
    body: (
      <>
        Wejdź w{" "}
        <span className="font-medium text-foreground">Plan lekcji</span>,
        wybierz przystanek lub miejscowość i wpisz godzinę startu (oraz końca)
        lekcji od poniedziałku do piątku. Zapisz plan — na rozkładzie włączysz
        dopasowanie kursów pod te godziny.
      </>
    ),
    href: "/lekcje",
    cta: "Przejdź do planu lekcji",
  },
  {
    number: "2",
    title: "Wydrukuj plan dojazdów",
    body: (
      <>
        Po uzupełnieniu godzin lekcji możesz wydrukować{" "}
        <span className="font-medium text-foreground">
          spersonalizowany plan dojazdów
        </span>
        : jedną kartkę na cały tydzień z lekcjami oraz godzinami wyjazdu i
        powrotu autobusu szkolnego (opcjonalnie też z najbliższym MZK). Wygodne
        do powieszenia w domu albo wrzucenia do torby.
      </>
    ),
    href: "/lekcje",
    cta: "Drukuj z planu lekcji",
    visual: "print",
  },
  {
    number: "3",
    title: "Ustaw trasę MZK",
    body: (
      <>
        W zakładce <span className="font-medium text-foreground">MZK</span>{" "}
        wybierz przystanek wsiadania i wysiadania na trasie do szkoły
        (opcjonalnie numer linii). Zapisz trasę — w trybie{" "}
        <span className="font-medium text-foreground">Szkolny + MZK</span>{" "}
        zobaczysz też kursy miejskie; odwozy użyją trasy odwrotnej.
      </>
    ),
    href: "/mzk",
    cta: "Przejdź do trasy MZK",
  },
  {
    number: "4",
    title: "Otwórz rozkład",
    body: (
      <>
        Na <span className="font-medium text-foreground">Rozkładzie</span>{" "}
        wybierz źródło (Szkolny albo Szkolny + MZK), włącz{" "}
        <span className="font-medium text-foreground">Do planu lekcji</span> i
        ustaw dzień, miejsce oraz kierunek (dowozy / odwozy). Przy filtrze
        „Dziś” możesz skoczyć do{" "}
        <span className="font-medium text-foreground">Najbliższego kursu</span>.
      </>
    ),
    href: "/",
    cta: "Otwórz rozkład",
  },
  {
    number: "5",
    title: "Przydatne na co dzień",
    body: (
      <>
        <span className="font-medium text-foreground">Kopiuj link</span>{" "}
        udostępnia filtry rozkładu. Plan lekcji i trasę MZK możesz też{" "}
        <span className="font-medium text-foreground">przenieść na inne urządzenie</span>{" "}
        kodem QR z planu lekcji (podgląd nie zużywa kodu; ważny kilka minut).
        Gdy włączysz powiadomienia, kopia planu lekcji jest też zapisywana na
        serwerze, żeby przypomnienie dotyczyło tylko Twojego kursu. Motyw
        jasny/ciemny znajdziesz w nagłówku, a opinię lub pomysł wyślesz z
        przycisku <span className="font-medium text-foreground">Opinia</span> w
        rogu ekranu.
      </>
    ),
  },
];

export function AboutGuide() {
  return (
    <ol className="space-y-10 sm:space-y-12">
      {steps.map((step, index) => (
        <li
          key={step.number}
          className={cn(
            "grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-5",
            index > 0 && "border-t border-border/50 pt-10 sm:pt-12",
          )}
        >
          <span
            aria-hidden
            className="font-display text-3xl font-bold tabular-nums text-bus/80 sm:pt-0.5 sm:text-4xl"
          >
            {step.number}
          </span>
          <div className="min-w-0 space-y-3">
            <h2 className="font-display text-xl font-semibold tracking-tight text-asphalt sm:text-2xl">
              {step.title}
            </h2>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              {step.body}
            </p>
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
      ))}
    </ol>
  );
}
