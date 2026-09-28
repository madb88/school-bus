import type { LucideIcon } from "lucide-react";
import {
  Check,
  Circle,
  Clock,
  Heart,
  Lightbulb,
  Search,
  Settings,
  Smartphone,
} from "lucide-react";
import { AboutProjectFeedbackCta } from "@/components/about-project-feedback-cta";
import { PageEyebrow } from "@/components/page-eyebrow";
import { cn } from "cn";

type Pillar = {
  icon: LucideIcon;
  title: string;
  body: string;
  iconWrapClassName: string;
};

const pillars: readonly Pillar[] = [
  {
    icon: Search,
    title: "Rozkłady w jednym miejscu",
    body: "Kursy autobusów szkolnych i miejskich są zebrane w jednym miejscu, żeby łatwiej było znaleźć potrzebny przejazd.",
    iconWrapClassName:
      "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
  },
  {
    icon: Clock,
    title: "Aktualne informacje",
    body: "Rozkłady szkolne i MZK są regularnie odświeżane z oficjalnych źródeł. Gdy zmienia się organizacja transportu, dane na stronie też mogą zostać zaktualizowane.",
    iconWrapClassName:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  {
    icon: Smartphone,
    title: "Prosto i wygodnie",
    body: "Strona jest zaprojektowana tak, żeby szybko sprawdzić rozkład zarówno na komputerze, jak i na telefonie.",
    iconWrapClassName:
      "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
  },
  {
    icon: Heart,
    title: "Tworzone z myślą o rodzicach",
    body: "To mały projekt rozwijany przede wszystkim po to, żeby codzienna organizacja dojazdów dzieci była trochę prostsza.",
    iconWrapClassName:
      "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
  },
];

type RoadmapItem = {
  label: string;
};

type RoadmapColumn = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: readonly RoadmapItem[];
  className: string;
  iconWrapClassName: string;
  bulletSolid?: boolean;
  bulletClassName: string;
};

const roadmapColumns: readonly RoadmapColumn[] = [
  {
    id: "done",
    title: "Gotowe",
    icon: Check,
    className:
      "border-emerald-200/80 bg-emerald-50/90 dark:border-emerald-500/25 dark:bg-emerald-500/10",
    iconWrapClassName: "bg-emerald-500 text-white shadow-sm shadow-emerald-500/25",
    bulletSolid: true,
    bulletClassName: "bg-emerald-500 text-white",
    items: [
      { label: "Rozkłady autobusów szkolnych" },
      { label: "Rozkłady autobusów miejskich" },
      { label: "Regularnie odświeżane dane o kursach" },
      { label: "Wybór dnia tygodnia" },
      { label: "Personalizowany plan dojazdów" },
      { label: "Wydruk tygodniowego planu" },
      { label: "Kompaktowy wydruk do kieszeni" },
      { label: "Wersja PWA / korzystanie na telefonie" },
      { label: "Przenoszenie ustawień kodem QR" },
    ],
  },
  {
    id: "in-progress",
    title: "W trakcie",
    icon: Settings,
    className:
      "border-sky-200/80 bg-sky-50/90 dark:border-sky-500/25 dark:bg-sky-500/10",
    iconWrapClassName: "bg-sky-500 text-white shadow-sm shadow-sky-500/25",
    bulletClassName: "text-sky-500 dark:text-sky-400",
    items: [
      { label: "Dalsze usprawnienia powiadomień" },
      { label: "Ulepszenia istniejących funkcji" },
      { label: "Poprawki UX na podstawie opinii użytkowników" },
      { label: "Dalsze rozwijanie obsługi rozkładów" },
      { label: "Kolejne usprawnienia aplikacji mobilnej" },
    ],
  },
  {
    id: "ideas",
    title: "Pomysły",
    icon: Lightbulb,
    className:
      "border-orange-200/80 bg-orange-50/90 dark:border-orange-500/25 dark:bg-orange-500/10",
    iconWrapClassName: "bg-orange-500 text-white shadow-sm shadow-orange-500/25",
    bulletClassName: "text-orange-500 dark:text-orange-400",
    items: [
      { label: "Wygodniejsza synchronizacja ustawień między urządzeniami" },
      { label: "Zapisywanie ulubionych kursów" },
      { label: "Dalsza personalizacja rozkładów" },
      { label: "Kolejne szkoły i miejscowości" },
      { label: "Dodatkowe funkcje przydatne rodzicom" },
    ],
  },
];

export function AboutProject() {
  return (
    <div className="space-y-12 sm:space-y-14">
      <header className="space-y-3 sm:space-y-4">
        <PageEyebrow>O projekcie</PageEyebrow>
        <h1 className="max-w-2xl font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
          autobusszkolny.pl powstał z prostego pomysłu
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Chciałem stworzyć jedno miejsce, w którym rodzice mogą szybko
          sprawdzić, jak dziecko może dojechać do szkoły — bez szukania
          informacji w różnych rozkładach, dokumentach i stronach.
        </p>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Projekt rozwijam krok po kroku, dodając funkcje, które mają ułatwiać
          codzienne ogarnianie szkolnych dojazdów.
        </p>
      </header>

      <section aria-labelledby="about-pillars-heading" className="space-y-5">
        <h2 id="about-pillars-heading" className="sr-only">
          Co jest ważne w projekcie
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <li
                key={pillar.title}
                className="flex h-full flex-col gap-3.5 rounded-2xl border border-border/50 bg-card p-4 shadow-[0_8px_28px_-18px_color-mix(in_srgb,var(--foreground)_35%,transparent)] dark:border-border/60 dark:shadow-[0_10px_28px_-20px_rgba(0,0,0,0.55)] sm:p-5"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-full",
                    pillar.iconWrapClassName,
                  )}
                >
                  <Icon className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0 space-y-1.5">
                  <h3 className="font-display text-base font-semibold tracking-tight text-asphalt">
                    {pillar.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {pillar.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="about-next-heading" className="space-y-5">
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-[0.65rem] font-semibold tracking-[0.14em] text-bus uppercase">
            <span
              aria-hidden
              className="inline-block h-px w-5 bg-bus/70"
            />
            Rozwój projektu
          </p>
          <h2
            id="about-next-heading"
            className="font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl"
          >
            Co dalej?
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            autobusszkolny.pl cały czas się rozwija. Poniżej możesz zobaczyć, co
            już działa, nad czym aktualnie pracuję i jakie pomysły rozważam na
            przyszłość.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roadmapColumns.map((column) => {
            const ColumnIcon = column.icon;
            return (
              <article
                key={column.id}
                className={cn(
                  "flex min-w-0 flex-col rounded-2xl border p-5 sm:p-6",
                  column.id === "ideas" && "md:col-span-2 lg:col-span-1",
                  column.className,
                )}
              >
                <header className="mb-5 flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      column.iconWrapClassName,
                    )}
                  >
                    <ColumnIcon className="size-4" strokeWidth={2.5} />
                  </span>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-asphalt">
                    {column.title}
                  </h3>
                </header>
                <ul className="flex flex-1 flex-col gap-3">
                  {column.items.map((item) => (
                    <li
                      key={item.label}
                      className="grid grid-cols-[auto_1fr] items-start gap-2.5"
                    >
                      {column.bulletSolid ? (
                        <span
                          aria-hidden
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                            column.bulletClassName,
                          )}
                        >
                          <Check className="size-2.5" strokeWidth={3} />
                        </span>
                      ) : (
                        <Circle
                          aria-hidden
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            column.bulletClassName,
                          )}
                          strokeWidth={2}
                        />
                      )}
                      <span className="text-sm leading-snug text-foreground/90">
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
                {column.id === "ideas" ? (
                  <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                    To kierunki rozważane na przyszłość — nie obietnica, że
                    wszystkie trafią do aplikacji.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <AboutProjectFeedbackCta />
    </div>
  );
}
