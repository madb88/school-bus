"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Clock,
  Crown,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

const platforms = [
  {
    id: "ios",
    title: "iPhone i iPad",
    intro:
      "Na iPhonie i iPadzie aplikację dodajesz z Safari. Chrome i inne przeglądarki nie zapiszą jej jako osobnej aplikacji.",
    steps: [
      "Otwórz tę stronę w Safari.",
      "Stuknij Udostępnij — kwadrat ze strzałką w górę, na dole ekranu albo obok paska adresu.",
      "Przewiń listę i wybierz „Dodaj do ekranu początkowego”.",
      "Zostaw nazwę autobusszkolny i stuknij Dodaj.",
      "Otwórz ikonę z ekranu początkowego. Powiadomienia o kursie włączysz w profilu, w Planie Plus.",
    ],
    stepsWithoutPush: [
      "Otwórz tę stronę w Safari.",
      "Stuknij Udostępnij — kwadrat ze strzałką w górę, na dole ekranu albo obok paska adresu.",
      "Przewiń listę i wybierz „Dodaj do ekranu początkowego”.",
      "Zostaw nazwę autobusszkolny i stuknij Dodaj.",
      "Otwórz ikonę z ekranu początkowego i korzystaj z aplikacji jak z zwykłej aplikacji.",
    ],
  },
  {
    id: "android",
    title: "Android",
    intro:
      "Na Androidzie instalacja działa w Chrome. Po dodaniu ikona jest na ekranie głównym i otwiera się bez paska przeglądarki.",
    steps: [
      "Otwórz tę stronę w Chrome.",
      "Stuknij menu — trzy kropki w prawym górnym rogu.",
      "Wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”.",
      "Potwierdź instalację.",
      "Otwórz ikonę autobusszkolny i ustaw plan lekcji. Powiadomienia włączysz w profilu, w Planie Plus.",
    ],
    stepsWithoutPush: [
      "Otwórz tę stronę w Chrome.",
      "Stuknij menu — trzy kropki w prawym górnym rogu.",
      "Wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”.",
      "Potwierdź instalację.",
      "Otwórz ikonę autobusszkolny i ustaw plan lekcji.",
    ],
  },
] as const;

export type PushEntry = "off" | "login" | "profil" | "manage";

const PUSH_ENTRY = {
  login: { href: "/login", label: "Zaloguj się" },
  profil: { href: "/profil?plus=1", label: "Przejdź do profilu" },
  manage: { href: "/profil?powiadomienia=1", label: "Zarządzaj w profilu" },
} as const;

const PUSH_POINTS: readonly {
  icon: LucideIcon;
  label: string;
  iconWrapClassName: string;
}[] = [
  {
    icon: Smartphone,
    label: "Na telefon i tablet",
    iconWrapClassName:
      "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
  },
  {
    icon: CalendarDays,
    label: "Zgodne z Twoim planem lekcji",
    iconWrapClassName:
      "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
  },
  {
    icon: Clock,
    label: "Przypomnienie przed odjazdem",
    iconWrapClassName:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
];

type InstallGuideProps = {
  pushEntry?: PushEntry;
};

export function InstallGuide({ pushEntry = "off" }: InstallGuideProps) {
  const pushNotificationsEnabled = pushEntry !== "off";
  return (
    <div>
      <NotificationsFrame entry={pushEntry} />

      <Accordion
        multiple
        className="overflow-hidden rounded-2xl border border-border/70 bg-card"
      >
        {platforms.map((platform) => {
          const steps = pushNotificationsEnabled
            ? platform.steps
            : platform.stepsWithoutPush;
          return (
            <AccordionItem key={platform.id} value={platform.id}>
              <AccordionTrigger>{platform.title}</AccordionTrigger>
              <AccordionContent>
                <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                  {platform.intro}
                </p>
                <ol className="mt-5 max-w-2xl space-y-4">
                  {steps.map((step, stepIndex) => (
                    <li key={step} className="grid grid-cols-[auto_1fr] gap-3">
                      <span
                        aria-hidden
                        className="font-display text-xl font-bold tabular-nums text-bus/80"
                      >
                        {stepIndex + 1}
                      </span>
                      <p className="pt-0.5 text-base leading-relaxed text-foreground/85">
                        {step}
                      </p>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="pt-8">
        <Link
          href="/lekcje"
          className={buttonVariants({ size: "lg", variant: "default" })}
        >
          Ustaw plan lekcji
        </Link>
      </div>
    </div>
  );
}

function NotificationsFrame({ entry }: { entry: PushEntry }) {
  const enabled = entry !== "off";
  const action = enabled ? PUSH_ENTRY[entry] : null;

  return (
    <section
      aria-labelledby="instalacja-powiadomienia"
      className="mb-8 flex flex-col gap-5 rounded-2xl border border-sky-200/80 bg-sky-50/90 p-5 sm:p-6 dark:border-sky-500/25 dark:bg-sky-500/10 lg:flex-row lg:items-center lg:gap-8"
    >
      <div className="min-w-0 flex-1">
        <header className="mb-4 flex flex-wrap items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm shadow-sky-500/25"
          >
            <Bell className="size-4" strokeWidth={2.5} />
          </span>
          <h2
            id="instalacja-powiadomienia"
            className="font-display text-lg font-semibold tracking-tight text-asphalt sm:text-xl"
          >
            Powiadomienia o dowozach i odwozach
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-sky-300/70 bg-white/70 px-2 py-0.5 text-[0.7rem] leading-none font-semibold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
            <Crown aria-hidden className="size-3" />
            {enabled ? "Pakiet Plus" : "Wkrótce"}
          </span>
        </header>

        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {enabled
            ? "Otrzymuj przypomnienia, kiedy nadjeżdża autobus — prosto na telefon lub tablet."
            : "Powiadomienia pojawią się wkrótce. Na razie możesz dodać aplikację do ekranu i ustawić plan lekcji."}
        </p>

        <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-3">
          {PUSH_POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <li
                key={point.label}
                className="flex items-center gap-2.5"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    point.iconWrapClassName,
                  )}
                >
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <span className="text-sm leading-snug font-medium text-foreground/90">
                  {point.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {action ? (
        <Link
          href={action.href}
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-10 w-full shrink-0 rounded-xl px-4 lg:w-auto",
          )}
        >
          {action.label}
          <ArrowRight aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
