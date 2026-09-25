import Link from "next/link";
import { AboutScheduleMock } from "@/components/about-schedule-mock";
import { buttonVariants } from "@/components/ui/button";

export function AboutIntro() {
  return (
    <header className="mb-12 grid gap-8 sm:mb-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:gap-10">
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold tracking-tight text-asphalt sm:text-5xl">
          Jak zacząć
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Ustaw plan lekcji i trasę MZK — rozkład dopasuje dowozy, odwozy i
          kursy miejskie do Twojego dnia. Możesz też wydrukować
          spersonalizowany plan dojazdów na cały tydzień. Plan i trasa zostają
          w tej przeglądarce. Po włączeniu powiadomień kopia planu jest też na
          serwerze.
        </p>
        <div className="pt-1">
          <Link
            href="/lekcje"
            className={buttonVariants({ size: "lg", variant: "default" })}
          >
            Zacznij od planu lekcji
          </Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
        <AboutScheduleMock />
      </div>
    </header>
  );
}
