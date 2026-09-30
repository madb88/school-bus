"use client";

import { ArrowRight, Bell, CalendarDays, Crown, Smartphone } from "lucide-react";
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

const PUSH_POINTS = [
  {
    icon: Smartphone,
    label: "Na telefon i tablet",
    iconClass: "bg-bus/12 text-bus",
  },
  {
    icon: CalendarDays,
    label: "Zgodne z Twoim planem",
    iconClass: "bg-mzk/12 text-mzk",
  },
] as const;

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
      className="relative mb-8 overflow-hidden rounded-2xl border border-bus/30 bg-gradient-to-br from-sky-mist/80 via-background to-sky-mist/25 px-4 py-3.5 sm:px-5 dark:border-bus/40 dark:from-bus/12 dark:via-card dark:to-card"
    >
      <div className="relative flex flex-col gap-3.5 lg:flex-row lg:items-center lg:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-bus/12 sm:size-[3.75rem]">
            <Bell aria-hidden className="size-6 text-bus sm:size-7" />
          </span>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1 rounded-full border border-bus/20 bg-bus/10 px-2 py-0.5 text-[0.7rem] leading-none font-semibold text-bus">
              <Crown aria-hidden className="size-3" />
              {enabled ? "Tylko w Pakiecie Plus" : "Wkrótce"}
            </p>
            <h2
              id="instalacja-powiadomienia"
              className="mt-1.5 font-display text-lg leading-tight font-bold tracking-tight text-asphalt sm:text-xl"
            >
              <span className="text-bus">Powiadomienia</span> o dowozach i odwozach
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-snug text-muted-foreground">
              {enabled
                ? "Otrzymuj przypomnienia, kiedy nadjeżdża autobus — prosto na telefon lub tablet."
                : "Powiadomienia pojawią się wkrótce. Na razie możesz dodać aplikację do ekranu i ustawić plan lekcji."}
            </p>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 border-t border-bus/10 pt-2.5">
              {PUSH_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <li key={point.label} className="flex max-w-44 items-center gap-2">
                    <span
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full",
                        point.iconClass,
                      )}
                    >
                      <Icon aria-hidden className="size-3.5" />
                    </span>
                    <span className="text-xs leading-snug font-medium text-foreground/90">
                      {point.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
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
      </div>
    </section>
  );
}
