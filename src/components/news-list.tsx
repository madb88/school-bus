import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export type NewsItem = {
  id: string;
  dateLabel: string;
  title: string;
  lead: string;
  body: string;
  href?: string;
  cta?: string;
};

/** Newest first — prepend new entries here. */
export const NEWS_ITEMS: readonly NewsItem[] = [
  {
    id: "print-commute-plan",
    dateLabel: "24 września 2026",
    title: "Wydruk spersonalizowanego planu dojazdów",
    lead: "Z planu lekcji wydrukujesz jedną kartkę na cały tydzień: lekcje, wyjazd i powrót autobusu szkolnego.",
    body: "Wybierz przystanek, uzupełnij godziny startu i końca lekcji od poniedziałku do piątku, a potem użyj „Drukuj plan dojazdów”. Na papierze dostaniesz kompaktową tabelę z godzinami dopasowanymi do planu dziecka — wygodną do powieszenia w domu albo wrzucenia do torby. Na wydruku jest też kod QR prowadzący z powrotem do planu lekcji w aplikacji.",
    href: "/lekcje",
    cta: "Otwórz plan lekcji",
  },
];

export function NewsList({ items = NEWS_ITEMS }: { items?: readonly NewsItem[] }) {
  return (
    <ol className="animate-rise-delay-2 space-y-10 sm:space-y-12">
      {items.map((item, index) => (
        <li
          key={item.id}
          className={cn(
            "space-y-3",
            index > 0 && "border-t border-border/50 pt-10 sm:pt-12",
          )}
        >
          <time className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {item.dateLabel}
          </time>
          <h2 className="font-display text-xl font-bold tracking-tight text-asphalt sm:text-2xl">
            {item.title}
          </h2>
          <p className="max-w-2xl text-base leading-relaxed text-foreground/90">
            {item.lead}
          </p>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {item.body}
          </p>
          {item.href && item.cta ? (
            <div className="pt-1">
              <Link
                href={item.href}
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                {item.cta}
              </Link>
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
