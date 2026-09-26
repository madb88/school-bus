/**
 * Regulamin świadczenia usług drogą elektroniczną —
 * treść oparta na rzeczywistym kodzie aplikacji.
 *
 * Dane kontaktowe ujednolicone z polityką prywatności.
 * Dokument nie stanowi porady prawnej.
 */

const PROVIDER_NAME = "Jakub Kamiński";
const PROVIDER_EMAIL = "kaminskiqba@gmail.com";

type Section = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  afterBullets?: string[];
};

const SECTIONS: Section[] = [
  {
    id: "postanowienia-ogolne",
    title: "§1 Postanowienia ogólne",
    paragraphs: [
      `Niniejszy Regulamin określa zasady świadczenia usług drogą elektroniczną za pośrednictwem serwisu internetowego AutobusSzkolny.pl (dalej: „Serwis”), prowadzonego pod domeną autobusszkolny.pl oraz powiązanymi adresami, przez Usługodawcę: ${PROVIDER_NAME}, e-mail: ${PROVIDER_EMAIL}.`,
      "Serwis działa pod nazwą handlową „Dojazdy do szkoły”. Jest serwisem informacyjnym pomagającym rodzicom i uczniom korzystającym z dowozów do szkoły — w szczególności w zakresie przeglądania rozkładów i dopasowania kursów do planu lekcji.",
      "Usługodawca nie jest przewoźnikiem, nie organizuje transportu szkolnego ani komunikacji miejskiej i nie prowadzi sprzedaży biletów. Serwis nie zastępuje oficjalnych informacji właściwego przewoźnika, szkoły ani organizatora transportu.",
      "Korzystanie z Serwisu oznacza zapoznanie się z treścią Regulaminu. Serwis nie wymaga rejestracji konta ani osobnego zatwierdzania Regulaminu przed przeglądaniem rozkładów.",
      "W sprawach przetwarzania danych osobowych zastosowanie ma Polityka prywatności dostępna pod adresem /polityka-prywatnosci.",
    ],
  },
  {
    id: "definicje",
    title: "§2 Definicje",
    paragraphs: ["Użyte w Regulaminie określenia oznaczają:"],
    bullets: [
      "Serwis — aplikacja internetowa AutobusSzkolny.pl / „Dojazdy do szkoły”,",
      "Usługodawca — podmiot wskazany w §1,",
      "Użytkownik — osoba korzystająca z Serwisu,",
      "Usługa — funkcjonalność Serwisu opisana w §3, świadczona drogą elektroniczną,",
      "Rozkład szkolny — dane o dowozach i odwozach prezentowane na podstawie źródła wskazanego w Serwisie (szkolaolimpijczykow.pl),",
      "Rozkład MZK — wybrane dane komunikacji miejskiej prezentowane na podstawie danych GTFS MZK Zielona Góra,",
      "Plan lekcji — lokalna konfiguracja Użytkownika (miejsce / przystanek oraz godziny w dni robocze) służąca do dopasowania kursów,",
      "Web Push — powiadomienia przeglądarkowe, które Użytkownik może włączyć dobrowolnie,",
      "Transfer ustawień — przeniesienie wybranych ustawień między urządzeniami za pomocą kodu QR lub kodu tekstowego,",
      "PWA — możliwość dodania Serwisu do ekranu początkowego / zainstalowania jako aplikacji internetowej; nie jest wymagana do korzystania z rozkładów i pozostałych funkcji w przeglądarce.",
    ],
  },
  {
    id: "zakres-uslug",
    title: "§3 Rodzaje i zakres usług",
    paragraphs: [
      "W ramach Serwisu Usługodawca umożliwia Użytkownikowi w szczególności:",
    ],
    bullets: [
      "przeglądanie rozkładu autobusów szkolnych (dowozów i odwozów),",
      "przeglądanie wybranych kursów komunikacji miejskiej (MZK) na podstawie danych źródłowych,",
      "wyszukiwanie i filtrowanie kursów (m.in. według dnia, miejsca, kierunku),",
      "dopasowanie kursów do planu lekcji,",
      "utworzenie spersonalizowanego planu tygodnia oraz jego wydruk,",
      "lokalne zapisywanie konfiguracji w przeglądarce (bez obowiązku założenia konta),",
      "transfer ustawień między urządzeniami (kod QR / kod tekstowy),",
      "powiadomienia Web Push (włączane dobrowolnie przez Użytkownika),",
      "dodanie Serwisu do ekranu początkowego (PWA) — wyłącznie dla wygody; nie jest wymagane do przeglądania rozkładów,",
      "przesyłanie opinii za pomocą formularza w Serwisie.",
    ],
    afterBullets: [
      "Serwis działa w pełni w przeglądarce internetowej. Instalacja PWA nie jest warunkiem korzystania z Usługi. Niedostępność poszczególnych funkcji może wynikać z ograniczeń przeglądarki lub systemu Użytkownika (np. brak obsługi Web Push) albo z chwilowej niedostępności danych źródłowych.",
      "Serwis nie świadczy usług przewozu, rezerwacji miejsc, sprzedaży biletów ani obsługi reklamacji transportowych wobec przewoźnika.",
    ],
  },
  {
    id: "warunki-techniczne",
    title: "§4 Warunki techniczne korzystania z Serwisu",
    paragraphs: [
      "Do korzystania z Serwisu potrzebne są w szczególności:",
    ],
    bullets: [
      "urządzenie z dostępem do Internetu,",
      "aktualna przeglądarka internetowa z włączoną obsługą JavaScript,",
      "dla funkcji lokalnych — możliwość zapisu danych w pamięci przeglądarki (localStorage).",
    ],
    afterBullets: [
      "Serwis można dodać do ekranu początkowego lub zainstalować jako aplikację internetową (PWA), jeśli przeglądarka i system Użytkownika na to pozwalają. Instalacja PWA nie jest wymagana — rozkłady, plan lekcji, transfer ustawień i formularz opinii działają także bez niej, bezpośrednio w przeglądarce.",
      "Powiadomienia Web Push wymagają przeglądarki i systemu obsługujących Push oraz zgody Użytkownika. Na części urządzeń (np. iPhone) system może wymagać uprzedniego dodania Serwisu do ekranu początkowego, zanim powiadomienia będą dostępne — dotyczy to wyłącznie powiadomień, a nie korzystania z pozostałych funkcji Serwisu.",
      "Transfer ustawień za pomocą kodu QR jest wygodniejszy przy użyciu aparatu do zeskanowania kodu; nie jest to wymóg — kod tekstowy można wpisać ręcznie na stronie przywracania ustawień.",
      "Usługodawca dokłada starań, aby Serwis działał poprawnie w popularnych, aktualnych przeglądarkach, lecz nie gwarantuje pełnej zgodności z każdą konfiguracją sprzętową i programową.",
    ],
  },
  {
    id: "rozklady",
    title: "§5 Zasady korzystania z rozkładów",
    paragraphs: [
      "Serwis prezentuje dane pochodzące ze wskazanych źródeł zewnętrznych. Aktualne źródła i moment ostatniej aktualizacji są podawane w Serwisie (w szczególności w stopce).",
      "Rozkład szkolny pochodzi ze strony szkoły (szkolaolimpijczykow.pl / strona dowozów). Rozkład MZK pochodzi z danych publikowanych przez MZK Zielona Góra (GTFS). Godziny z GTFS mogą różnić się o kilka minut od informacji na tabliczce przystankowej.",
      "Dane w Serwisie mogą być okresowo aktualizowane. Rozkłady mogą ulec zmianie po stronie źródła — także między aktualizacjami w Serwisie.",
      "W faktycznym transporcie mogą wystąpić opóźnienia, odwołania kursów, objazdy, zmiany trasy, zmiany godzin lub inne odstępstwa od rozkładu. Serwis nie gwarantuje realizacji konkretnego kursu ani punktualności.",
      "Informacje w Serwisie mają charakter pomocniczy. W razie potrzeby ostateczne informacje dotyczące transportu należy zweryfikować u właściwego przewoźnika, szkoły lub organizatora transportu.",
      "Filtrowanie, wyszukiwanie i dopasowanie kursów do planu lekcji stanowią funkcje pomocnicze Serwisu i nie stanowią wiążącej informacji o dostępności przejazdu.",
    ],
  },
  {
    id: "plan-lekcji",
    title: "§6 Personalizacja i plan lekcji",
    paragraphs: [
      "Użytkownik może utworzyć plan lekcji (miejsce / przystanek oraz godziny rozpoczęcia, a opcjonalnie zakończenia lekcji w dni robocze) oraz ustawić powiązane preferencje, np. okno czasowe dopasowania kursów czy wybraną trasę MZK.",
      "W zwykłym korzystaniu z Serwisu (bez włączonych powiadomień Web Push) plan lekcji i powiązane ustawienia są przechowywane lokalnie w przeglądarce Użytkownika (localStorage) i służą do dopasowania wyświetlanych kursów oraz wydruku planu.",
      "Jeżeli Użytkownik włączy powiadomienia Web Push, część danych planu niezbędna do przygotowania przypomnień jest przesyłana i przechowywana po stronie serwera Usługodawcy — wyłącznie w celu realizacji powiadomień. Różnica polega na tym, że bez Push plan pozostaje na urządzeniu; z włączonym Push wybrany zakres danych planu trafia na serwer.",
      "Usługodawca nie wymaga konta ani logowania do korzystania z planu lekcji. Użytkownik odpowiada za poprawność wprowadzonych przez siebie godzin i miejsca.",
    ],
  },
  {
    id: "web-push",
    title: "§7 Powiadomienia Web Push",
    paragraphs: [
      "Powiadomienia Web Push są funkcją Serwisu włączaną dobrowolnie. Użytkownik włącza je samodzielnie i musi wyrazić zgodę w mechanizmie powiadomień przeglądarki lub systemu.",
      "Włączenie powiadomień wymaga wcześniej ustawionego miejsca oraz godzin w planie lekcji. Po zapisaniu subskrypcji Serwis może wysłać krótkie potwierdzenie włączenia. Użytkownik może także zamówić powiadomienie testowe.",
      "Aktualnie przypomnienia dotyczą autobusu szkolnego, a nie kursów MZK. Użytkownik może wybrać rodzaje powiadomień:",
    ],
    bullets: [
      "przypomnienie o odjeździe do szkoły — około 20 minut przed dopasowanym kursem,",
      "przypomnienie o autobusie powrotnym — około 20 minut przed odjazdem ze szkoły (gdy w planie podano godzinę końca lekcji),",
      "informacja o zmianie godzin w rozkładzie szkolnym (gdy wykryta zostanie aktualizacja treści rozkładu).",
    ],
    afterBullets: [
      "W celu realizacji powiadomień Serwis przechowuje na serwerze m.in.: subskrypcję Push (endpoint oraz klucze techniczne potrzebne do dostarczenia powiadomienia), dane planu niezbędne do wyliczenia przypomnień, wybrane rodzaje powiadomień oraz dane techniczne ograniczające powtórzenia (np. lista już wysłanych przypomnień danego dnia) i skrót treści rozkładu szkolnego.",
      "Rekordy powiadomień na serwerze nie mają w aplikacji automatycznego terminu ważności (TTL). Użytkownik przestaje otrzymywać powiadomienia, wyłączając je w Serwisie (lub cofając zgodę w ustawieniach przeglądarki / systemu). Serwis usuwa rekord subskrypcji także wtedy, gdy dostawca kanału Push zgłosi, że subskrypcja jest nieaktualna.",
      "Dostarczenie powiadomienia zależy od przeglądarki, systemu, dostawcy Push oraz dostępności infrastruktury (w tym harmonogramu wysyłki). Usługodawca nie gwarantuje, że każde przypomnienie dotrze w oczekiwanej chwili.",
    ],
  },
  {
    id: "transfer",
    title: "§8 Transfer ustawień między urządzeniami",
    paragraphs: [
      "Użytkownik może przenieść na inne urządzenie plan lekcji, trasę MZK oraz okno dopasowania kursów, generując w Serwisie kod QR oraz krótki kod tekstowy.",
      "Przed zapisem na serwerze dane są szyfrowane algorytmem AES-256-GCM. Na serwerze (Upstash Redis) przechowywany jest wyłącznie zaszyfrowany pakiet, powiązany z jednorazowym kodem.",
      "Kod jest ważny przez 15 minut (TTL). Użytkownik może najpierw zobaczyć podgląd ustawień — kod zużywa się dopiero po potwierdzeniu przywrócenia (jednorazowe odczytanie i usunięcie z magazynu). Nieużyty kod wygasa automatycznie po upływie TTL.",
      "Kod transferowy należy traktować jako poufny. Nie należy udostępniać go osobom trzecim — osoba posiadająca ważny kod może pobrać ustawienia Użytkownika.",
      "Funkcja może być niedostępna, gdy serwer nie ma skonfigurowanego magazynu Redis lub sekretu szyfrowania. Serwis limituje liczbę żądań tworzenia i odbierania kodów z jednego adresu IP, aby ograniczyć nadużycia.",
    ],
  },
  {
    id: "opinie",
    title: "§9 Formularz opinii",
    paragraphs: [
      "Użytkownik może przesłać opinię za pomocą formularza dostępnego w Serwisie. Treść wiadomości jest wymagana (do 2000 znaków). Adres e-mail zwrotny jest opcjonalny.",
      "Zabrania się przesyłania treści bezprawnych, obraźliwych, spamowych, zawierających złośliwe oprogramowanie lub naruszających prawa osób trzecich.",
      "W celu ograniczenia nadużyć Serwis stosuje mechanizm antybotowy Cloudflare Turnstile, ukryte pole kontrolne oraz limit liczby wiadomości z jednego adresu IP.",
      "Wiadomość trafia do Usługodawcy za pośrednictwem usługi pocztowej (Resend). Podanie e-maila umożliwia odpowiedź; nie jest wymagane do wysłania opinii.",
    ],
  },
  {
    id: "prawa-obowiazki",
    title: "§10 Prawa i obowiązki Użytkownika",
    paragraphs: [
      "Użytkownik może korzystać z Serwisu zgodnie z jego przeznaczeniem oraz obowiązującym prawem.",
      "Użytkownik zobowiązuje się w szczególności do:",
    ],
    bullets: [
      "podawania w planie lekcji i formularzach danych zgodnych z zamiarem korzystania z funkcji Serwisu,",
      "nieudostępniania kodów transferowych osobom nieuprawnionym,",
      "nierozpowszechniania za pośrednictwem formularza opinii treści bezprawnych,",
      "nierozpoczynania prób nieautoryzowanego dostępu do Serwisu, jego infrastruktury ani danych innych Użytkowników,",
      "nieobchodzenia zabezpieczeń technicznych ani limitów zapytań,",
      "nieprzeprowadzania ataków na API, nie przeciążania Serwisu nadmierną liczbą żądań ani niegenerowania automatycznie nadmiernego ruchu,",
      "niewykorzystywania wykrytych błędów w sposób szkodliwy dla Usługodawcy lub innych Użytkowników.",
    ],
    afterBullets: [
      "W razie naruszenia powyższych zasad Usługodawca może ograniczyć dostęp do funkcji Serwisu w zakresie niezbędnym do ochrony bezpieczeństwa i ciągłości działania (np. limity zapytań, odmowa przyjęcia żądania).",
    ],
  },
  {
    id: "odpowiedzialnosc",
    title: "§11 Odpowiedzialność i aktualność informacji",
    paragraphs: [
      "Usługodawca dokłada należytej staranności, aby Serwis działał poprawnie i prezentował dane na podstawie dostępnych źródeł, jednak rozkłady mają charakter informacyjny i pomocniczy.",
      "Usługodawca nie ponosi odpowiedzialności za skutki oparcia się wyłącznie na informacji z Serwisu bez weryfikacji u właściwego przewoźnika, szkoły lub organizatora transportu — w szczególności za spóźnienie, odwołanie kursu, zmianę rozkładu lub inną niedogodność transportową leżącą poza Serwisem.",
      "Usługodawca nie gwarantuje, że dopasowanie kursu do planu lekcji będzie zawsze optymalne dla konkretnej sytuacji Użytkownika; wynik zależy od wprowadzonych danych i aktualnej treści rozkładu w Serwisie.",
      "Odpowiedzialność Usługodawcy za działanie transferu ustawień, powiadomień Web Push i formularza opinii ogranicza się do starannego działania w ramach dostępnej infrastruktury. Nie obejmuje to awarii lub ograniczeń po stronie przeglądarki, systemu Użytkownika, dostawcy Push, dostawcy hostingu ani źródeł rozkładów.",
      "Powyższe ograniczenia nie wyłączają odpowiedzialności, której zgodnie z bezwzględnie obowiązującymi przepisami prawa nie można ograniczyć ani wyłączyć — w szczególności wobec konsumentów w zakresie przewidzianym przepisami.",
    ],
  },
  {
    id: "dostepnosc",
    title: "§12 Przerwy techniczne i dostępność Serwisu",
    paragraphs: [
      "Usługodawca dokłada starań, aby Serwis był dostępny, lecz nie zobowiązuje się do określonego poziomu dostępności (SLA).",
      "Dostępność może być ograniczona lub czasowo zawieszona z powodu m.in.:",
    ],
    bullets: [
      "prac konserwacyjnych i aktualizacji,",
      "awarii Serwisu lub infrastruktury hostingowej,",
      "problemów z usługami zewnętrznymi (np. Redis, poczta, Turnstile, Analytics),",
      "braku, opóźnienia lub błędu danych źródłowych rozkładów,",
      "problemów z dostawcą powiadomień Push lub harmonogramem wysyłki.",
    ],
    afterBullets: [
      "W miarę możliwości Usługodawca będzie dążył do przywrócenia działania Serwisu, bez gwarancji konkretnego terminu.",
    ],
  },
  {
    id: "reklamacje",
    title: "§13 Reklamacje i kontakt",
    paragraphs: [
      // TODO(przed publikacją): uzupełnij e-mail kontaktowy Usługodawcy
      `Reklamacje dotyczące działania Serwisu można zgłaszać na adres e-mail: ${PROVIDER_EMAIL}.`,
      "W zgłoszeniu warto podać: opis problemu, przybliżony czas wystąpienia, używaną przeglądarkę / urządzenie oraz — jeśli dotyczy — czy problem dotyczy rozkładu, planu lekcji, transferu, powiadomień czy formularza opinii.",
      "Usługodawca rozpatruje zgłoszenia dotyczące działania Serwisu w rozsądnym terminie i udziela odpowiedzi na wskazany przez Użytkownika adres e-mail (jeżeli został podany). Reklamacja dotycząca transportu (np. odwołany kurs) powinna być kierowana do właściwego przewoźnika, szkoły lub organizatora transportu.",
      "Niniejszy paragraf nie ogranicza uprawnień konsumenta wynikających z przepisów prawa.",
    ],
  },
  {
    id: "zmiany",
    title: "§14 Zmiany Regulaminu",
    paragraphs: [
      "Usługodawca może zmieniać Regulamin, gdy wymaga tego zmiana funkcji Serwisu, przepisy prawa lub względy bezpieczeństwa i organizacji świadczenia usług.",
      "Aktualna wersja Regulaminu jest zawsze dostępna pod adresem /regulamin. Data ostatniej aktualizacji znajduje się na końcu dokumentu.",
      "Istotna zmiana zakresu usług powinna być odzwierciedlona w treści Regulaminu. Dalsze korzystanie z Serwisu po publikacji nowej wersji oznacza korzystanie na zasadach zaktualizowanego Regulaminu — z zastrzeżeniem uprawnień wynikających z bezwzględnie obowiązujących przepisów.",
    ],
  },
  {
    id: "postanowienia-koncowe",
    title: "§15 Postanowienia końcowe",
    paragraphs: [
      "W sprawach nieuregulowanych w Regulaminie zastosowanie mają przepisy prawa polskiego, w szczególności przepisy o świadczeniu usług drogą elektroniczną oraz — w zakresie danych osobowych — RODO i ustawa o ochronie danych osobowych, a także Polityka prywatności Serwisu.",
      "Jeżeli którekolwiek postanowienie Regulaminu okaże się nieważne lub nieskuteczne, pozostałe postanowienia zachowują moc.",
      "Niniejszy dokument ma charakter regulaminu świadczenia usług drogą elektroniczną i nie stanowi porady prawnej. Postanowienia wymagające indywidualnej oceny prawnej (m.in. dane Usługodawcy, klauzule wobec konsumentów, podstawy odpowiedzialności) powinny zostać zweryfikowane przed publikacją.",
    ],
  },
];

export function TermsOfServiceContent() {
  return (
    <article className="animate-rise-delay-2 space-y-10 sm:space-y-12">
      {SECTIONS.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={
            index > 0
              ? "space-y-3 border-t border-border/50 pt-10 sm:pt-12"
              : "space-y-3"
          }
        >
          <h2 className="font-display text-xl font-bold tracking-tight text-asphalt sm:text-2xl">
            {section.title}
          </h2>
          {section.paragraphs.map((text, i) => (
            <p
              key={`${section.id}-p-${i}`}
              className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              {text}
            </p>
          ))}
          {section.bullets ? (
            <ul className="max-w-2xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {section.bullets.map((item, i) => (
                <li key={`${section.id}-b-${i}`}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.afterBullets?.map((text, i) => (
            <p
              key={`${section.id}-a-${i}`}
              className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
            >
              {text}
            </p>
          ))}
        </section>
      ))}

      <p className="border-t border-border/50 pt-8 text-xs text-muted-foreground sm:pt-10">
        Ostatnia aktualizacja: 26 września 2026
      </p>
    </article>
  );
}
