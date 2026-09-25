import Link from "next/link";
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
      "Zostaw nazwę Dojazdy i stuknij Dodaj.",
      "Otwórz ikonę z ekranu początkowego. Dopiero w tej aplikacji włączysz powiadomienia o swoim kursie.",
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
      "Otwórz ikonę Dojazdy, ustaw plan lekcji i włącz powiadomienia.",
    ],
  },
] as const;

export function InstallGuide() {
  return (
    <div className="animate-rise-delay-2 space-y-12 sm:space-y-14">
      {platforms.map((platform, index) => (
        <section
          key={platform.id}
          className={
            index > 0 ? "border-t border-border/50 pt-12 sm:pt-14" : undefined
          }
        >
          <h2 className="font-display text-2xl font-semibold tracking-tight text-asphalt sm:text-3xl">
            {platform.title}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {platform.intro}
          </p>
          <ol className="mt-6 max-w-2xl space-y-4">
            {platform.steps.map((step, stepIndex) => (
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
        </section>
      ))}

      <div className="border-t border-border/50 pt-8">
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
