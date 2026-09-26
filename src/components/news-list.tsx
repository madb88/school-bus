import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export type NewsItem = {
  id: string;
  dateLabel: string;
  title: string;
  lead: string;
  body: string;
  pointsTitle?: string;
  points?: readonly string[];
  afterTitle?: string;
  after?: string;
  closing?: string;
  href?: string;
  cta?: string;
};

/** Newest first — prepend new entries here. */
export const NEWS_ITEMS: readonly NewsItem[] = [
  {
    id: "compact-print-and-week-days",
    dateLabel: "26 września 2026",
    title: "Kompaktowy wydruk i rozkład na każdy dzień",
    lead: "Jeszcze łatwiej sprawdzisz, kiedy dziecko ma autobus — i możesz wydrukować mu rozkład do kieszeni.",
    body: "W planie lekcji możesz teraz wydrukować kompaktowy rozkład z najbliższym odjazdem do szkoły i powrotem do domu. Wystarczy go wyciąć wzdłuż zaznaczonej linii i schować dziecku do kieszeni lub plecaka.\n\nNa stronie rozkładu możesz również wybrać dowolny dzień tygodnia, aby od razu sprawdzić godziny odjazdów w poniedziałek, wtorek, środę i kolejne dni nauki.",
    pointsTitle: "Co nowego?",
    points: [
      "🎒 Rozkład do kieszeni — mały, skrócony wydruk z godziną wyjazdu do szkoły i powrotu do domu.",
      "🚌 Trzy warianty wydruku — pełny rozkład autobusu szkolnego, autobus szkolny + najbliższe kursy MZK oraz wersja kompaktowa.",
      "📅 Rozkład na każdy dzień tygodnia — wybierz konkretny dzień i sprawdź wszystkie potrzebne kursy, nie tylko dzisiejsze i jutrzejsze.",
    ],
    href: "/lekcje",
    cta: "Otwórz plan lekcji",
  },
  {
    id: "pwa-home-screen",
    dateLabel: "25 września 2026",
    title: "Autobus Szkolny teraz jako aplikacja!",
    lead: "Od teraz możesz korzystać z Autobusu Szkolnego jeszcze wygodniej — prosto z ekranu telefonu.",
    body: "Dodaj stronę do ekranu głównego, a zyskasz szybki dostęp do rozkładu dowozów i odwozów bez konieczności otwierania przeglądarki i wpisywania adresu strony.",
    pointsTitle: "Co się zmienia?",
    points: [
      "📱 własna ikona na ekranie telefonu,",
      "⚡ szybki dostęp do aplikacji,",
      "🚌 rozkład zawsze pod ręką,",
      "📴 aplikacja otwiera się jak zwykła aplikacja, bez paska przeglądarki.",
    ],
    afterTitle: "Jak zacząć?",
    after:
      "Otwórz autobusszkolny.pl na telefonie i wybierz opcję „Dodaj do ekranu głównego”.",
    closing: "Autobus Szkolny — teraz zawsze pod ręką. 🚌",
    href: "/instalacja",
    cta: "Jak dodać aplikację",
  },
  {
    id: "settings-transfer-qr",
    dateLabel: "24 września 2026",
    title: "Przeniesienie ustawień na inne urządzenie",
    lead: "Plan lekcji i trasę MZK przeniesiesz z komputera na telefon kodem QR — bez konta i bez przepisywania godzin.",
    body: "Na stronie planu lekcji wybierz „Przenieś na inne urządzenie”: zobaczysz kod QR i krótki kod tekstowy (ważny ok. 15 minut). Na drugim urządzeniu zeskanuj kod albo otwórz /przywroc i wpisz go ręcznie. Najpierw widać podgląd ustawień — kod zużywa się dopiero po potwierdzeniu przywrócenia. Anulowanie podglądu nie kasuje kodu.",
    href: "/lekcje",
    cta: "Otwórz plan lekcji",
  },
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
    <ol className="space-y-4 sm:space-y-5">
      {items.map((item) => (
        <li
          key={item.id}
          className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4 shadow-[0_12px_40px_-24px_color-mix(in_srgb,var(--asphalt)_40%,transparent)] backdrop-blur-sm sm:p-6"
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
          {item.body.split(/\n\n+/).map((paragraph) => (
            <p
              key={paragraph}
              className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              {paragraph}
            </p>
          ))}
          {item.points && item.points.length > 0 ? (
            <div className="max-w-2xl space-y-2">
              {item.pointsTitle ? (
                <h3 className="text-sm font-semibold text-foreground sm:text-base">
                  {item.pointsTitle}
                </h3>
              ) : null}
              <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {item.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {item.after ? (
            <div className="max-w-2xl space-y-2">
              {item.afterTitle ? (
                <h3 className="text-sm font-semibold text-foreground sm:text-base">
                  {item.afterTitle}
                </h3>
              ) : null}
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {item.after}
              </p>
            </div>
          ) : null}
          {item.closing ? (
            <p className="max-w-2xl text-sm leading-relaxed text-foreground/90 sm:text-base">
              {item.closing}
            </p>
          ) : null}
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
