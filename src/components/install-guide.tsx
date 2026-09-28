"use client";

import Link from "next/link";
import { InstallNotifications } from "@/components/install-notifications";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { buttonVariants } from "@/components/ui/button";

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
      "Otwórz ikonę z ekranu początkowego. Dopiero w tej aplikacji włączysz powiadomienia o swoim kursie.",
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
      "Otwórz ikonę autobusszkolny, ustaw plan lekcji i włącz powiadomienia.",
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

type InstallGuideProps = {
  pushNotificationsEnabled?: boolean;
};

export function InstallGuide({
  pushNotificationsEnabled = false,
}: InstallGuideProps) {
  return (
    <div>
      <Accordion
        multiple
        defaultValue={["powiadomienia"]}
        className="overflow-hidden rounded-2xl border border-border/70 bg-card"
      >
        <AccordionItem value="powiadomienia">
          <AccordionTrigger>
            <span className="inline-flex flex-wrap items-center gap-2">
              Powiadomienia
              {pushNotificationsEnabled ? null : (
                <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs font-semibold leading-none tracking-wide text-muted-foreground">
                  Wkrótce
                </span>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            {pushNotificationsEnabled ? (
              <InstallNotifications />
            ) : (
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
                Powiadomienia pojawią się wkrótce. Na razie możesz dodać
                aplikację do ekranu i ustawić plan lekcji.
              </p>
            )}
          </AccordionContent>
        </AccordionItem>

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
