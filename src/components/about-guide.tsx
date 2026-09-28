import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bus,
  CalendarClock,
  Printer,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { AboutLessonMock } from "@/components/about-lesson-mock";
import { AboutMzkMock } from "@/components/about-mzk-mock";
import { AboutPrintMock } from "@/components/about-print-mock";
import { AboutScheduleMock } from "@/components/about-schedule-mock";
import { AboutTipsMock } from "@/components/about-tips-mock";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";

type GuideStep = {
  number: string;
  icon: LucideIcon;
  title: string;
  summary: string;
  instructions: ReactNode;
  href?: string;
  cta?: string;
  preview: ReactNode;
};

const steps: GuideStep[] = [
  {
    number: "1",
    icon: BookOpen,
    title: "Ustaw plan lekcji",
    summary: "Podaj godziny lekcji i miejsce — rozkład dopasuje autobusy.",
    instructions: (
      <ol className="space-y-3">
        <li className="grid grid-cols-[auto_1fr] gap-3">
          <span
            aria-hidden
            className="font-display text-base font-bold tabular-nums text-bus/80"
          >
            1
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-foreground">Wejdź w Plan lekcji</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Otwórz zakładkę{" "}
              <span className="font-medium text-foreground">Plan lekcji</span>{" "}
              w menu.
            </p>
          </div>
        </li>
        <li className="grid grid-cols-[auto_1fr] gap-3">
          <span
            aria-hidden
            className="font-display text-base font-bold tabular-nums text-bus/80"
          >
            2
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-foreground">Wpisz godziny lekcji</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Dla każdego dnia od poniedziałku do piątku podaj start i koniec.
            </p>
          </div>
        </li>
        <li className="grid grid-cols-[auto_1fr] gap-3">
          <span
            aria-hidden
            className="font-display text-base font-bold tabular-nums text-bus/80"
          >
            3
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-foreground">
              Wybierz przystanek lub miejscowość
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              To miejsce, z którego dziecko jedzie do szkoły.
            </p>
          </div>
        </li>
        <li className="grid grid-cols-[auto_1fr] gap-3">
          <span
            aria-hidden
            className="font-display text-base font-bold tabular-nums text-bus/80"
          >
            4
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-foreground">Zapisz plan</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Od tej pory rozkład może automatycznie dopasować kursy do lekcji.
            </p>
          </div>
        </li>
      </ol>
    ),
    href: "/lekcje",
    cta: "Przejdź do planu lekcji →",
    preview: <AboutLessonMock />,
  },
  {
    number: "2",
    icon: Printer,
    title: "Wydrukuj tygodniowy plan dojazdów",
    summary: "Jedna kartka z lekcjami, wyjazdami i powrotami na cały tydzień.",
    instructions: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Po ustawieniu planu lekcji możesz wydrukować tygodniowy plan dojazdów
          — z godzinami lekcji oraz odjazdem i powrotem autobusu szkolnego.
        </p>
        <p>
          Opcjonalnie dodaj najbliższe kursy MZK. Wydrukuj, powieś w domu i
          gotowe — bez ciągłego sprawdzania telefonu.
        </p>
      </div>
    ),
    href: "/lekcje",
    cta: "Drukuj z planu lekcji →",
    preview: <AboutPrintMock />,
  },
  {
    number: "3",
    icon: Bus,
    title: "Dodaj trasę MZK",
    summary: "Miejski autobus obok szkolnego w jednym rozkładzie.",
    instructions: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          W zakładce{" "}
          <span className="font-medium text-foreground">MZK</span> wybierz
          przystanek wsiadania i wysiadania. Numer linii jest opcjonalny.
        </p>
        <p>
          Po zapisaniu włącz{" "}
          <span className="font-medium text-foreground">Szkolny + MZK</span> w
          rozkładzie. Trasa powrotna działa automatycznie w odwrotnym kierunku.
        </p>
      </div>
    ),
    href: "/mzk",
    cta: "Przejdź do trasy MZK →",
    preview: <AboutMzkMock />,
  },
  {
    number: "4",
    icon: CalendarClock,
    title: "Sprawdź dzisiejszy rozkład",
    summary: "Najbliższy kurs do szkoły i z powrotem — na dziś lub inny dzień.",
    instructions: (
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          W{" "}
          <span className="font-medium text-foreground">Rozkładzie</span>{" "}
          wybierz tryb (Szkolny albo Szkolny + MZK), dzień, miejsce i kierunek.
        </p>
        <p>
          Masz plan lekcji? Włącz{" "}
          <span className="font-medium text-foreground">Do planu lekcji</span>.
          Chcesz tylko dziś — wybierz{" "}
          <span className="font-medium text-foreground">Dziś</span> i przejdź do
          najbliższego kursu.
        </p>
      </div>
    ),
    href: "/",
    cta: "Otwórz rozkład →",
    preview: <AboutScheduleMock />,
  },
  {
    number: "5",
    icon: Sparkles,
    title: "Korzystaj wygodniej",
    summary: "PWA, powiadomienia, udostępnianie i przenoszenie planu.",
    instructions: (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Kilka drobnych funkcji, które ułatwiają codzienne korzystanie —
        zwłaszcza na telefonie.
      </p>
    ),
    href: "/instalacja",
    cta: "Zobacz instalację aplikacji →",
    preview: <AboutTipsMock />,
  },
];

function GuidePanel({
  instructions,
  preview,
  href,
  cta,
}: {
  instructions: ReactNode;
  preview: ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-8">
      <div className="min-w-0 space-y-4">
        {instructions}
        {href ? (
          <div className="pt-1">
            <Link
              href={href}
              className={buttonVariants({
                size: "sm",
                variant: "secondary",
              })}
            >
              {cta}
            </Link>
          </div>
        ) : null}
      </div>
      <div className="min-w-0 w-full">{preview}</div>
    </div>
  );
}

export function AboutGuide() {
  return (
    <div className="space-y-10">
      <Accordion
        multiple
        defaultValue={["1"]}
        className="overflow-hidden rounded-2xl border border-border/70 bg-card"
      >
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <AccordionItem key={step.number} value={step.number}>
              <AccordionTrigger className="items-start py-4 sm:items-center sm:py-5">
                <span className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-3.5">
                  <span
                    aria-hidden
                    className="font-display text-xl font-bold tabular-nums text-bus/80 sm:text-2xl"
                  >
                    {step.number}
                  </span>
                  <StepIcon
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-bus sm:mt-0 sm:size-6"
                    strokeWidth={2}
                  />
                  <span className="min-w-0 space-y-1">
                    <span className="block font-display text-base font-semibold tracking-tight text-asphalt sm:text-xl">
                      {step.title}
                    </span>
                    <span className="block font-sans text-sm font-normal leading-snug text-muted-foreground sm:text-base">
                      {step.summary}
                    </span>
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <GuidePanel
                  instructions={step.instructions}
                  preview={step.preview}
                  href={step.href}
                  cta={step.cta}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="rounded-2xl border border-border/70 bg-card/70 px-5 py-6 text-center sm:px-8 sm:py-8">
        <p className="font-display text-lg font-semibold tracking-tight text-asphalt sm:text-xl">
          Gotowy, żeby zacząć?
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Najszybciej zaczniesz od planu lekcji — reszta dopasuje się sama.
        </p>
        <div className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            href="/lekcje"
            className={buttonVariants({ size: "lg", variant: "default" })}
          >
            Ustaw plan lekcji
          </Link>
          <Link
            href="/"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Otwórz rozkład
          </Link>
        </div>
      </div>
    </div>
  );
}
