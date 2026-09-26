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
        <div className="max-w-xl space-y-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
          <p>
            Podaj plan lekcji, a my pokażemy Ci, którym autobusem dziecko może
            pojechać do szkoły i czym wrócić do domu.
          </p>
          <p>
            Możesz też dodać trasę MZK, jeśli dziecko korzysta z komunikacji
            miejskiej. Na koniec możesz wydrukować gotowy, tygodniowy plan
            dojazdów.
          </p>
          <p>
            Plan pozostaje zapisany w tej przeglądarce. Jeśli włączysz
            powiadomienia, zapisujemy go również na serwerze, aby wysyłać
            przypomnienia dotyczące właściwych kursów.
          </p>
        </div>
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
