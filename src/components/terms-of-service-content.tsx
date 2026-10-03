/**
 * Regulamin świadczenia usług drogą elektroniczną —
 * treść oparta na rzeczywistym kodzie aplikacji.
 *
 * Dane kontaktowe ujednolicone z polityką prywatności.
 * Dokument nie stanowi porady prawnej.
 */

const PROVIDER_NAME = "Jakub Kamiński";
const PROVIDER_EMAIL = "kontakt@autobusszkolny.pl";

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
      `Niniejszy Regulamin określa zasady świadczenia usług drogą elektroniczną za pośrednictwem serwisu internetowego autobusszkolny.pl (dalej: „Serwis”), prowadzonego pod domeną autobusszkolny.pl oraz powiązanymi adresami, przez Usługodawcę: ${PROVIDER_NAME}, e-mail: ${PROVIDER_EMAIL}.`,
      "Serwis autobusszkolny.pl (Dojazdy do szkoły) jest serwisem informacyjnym pomagającym rodzicom i uczniom korzystającym z dowozów do szkoły — w szczególności w zakresie przeglądania rozkładów i dopasowania kursów do planu lekcji.",
      "Usługodawca nie jest przewoźnikiem, nie organizuje transportu szkolnego ani komunikacji miejskiej i nie prowadzi sprzedaży biletów. Serwis nie zastępuje oficjalnych informacji właściwego przewoźnika, szkoły ani organizatora transportu.",
      "Korzystanie z podstawowych rozkładów nie wymaga rejestracji konta. Konto (logowanie e-mailem) jest opcjonalne i potrzebne do Planu Plus oraz powiązanych funkcji. Korzystanie z Serwisu oznacza zapoznanie się z treścią Regulaminu.",
      "W sprawach przetwarzania danych osobowych zastosowanie ma Polityka prywatności dostępna pod adresem /polityka-prywatnosci.",
    ],
  },
  {
    id: "definicje",
    title: "§2 Definicje",
    paragraphs: ["Użyte w Regulaminie określenia oznaczają:"],
    bullets: [
      "Serwis — aplikacja internetowa autobusszkolny.pl (Dojazdy do szkoły),",
      "Usługodawca — podmiot wskazany w §1,",
      "Użytkownik — osoba korzystająca z Serwisu,",
      "Usługa — funkcjonalność Serwisu opisana w §3, świadczona drogą elektroniczną,",
      "Konto — opcjonalny rekord Użytkownika powiązany z adresem e-mail, tworzony przy logowaniu,",
      "Plan Plus — opcjonalna, płatna funkcja Serwisu (jednorazowa opłata za rok szkolny), odblokowująca m.in. powiadomienia Web Push,",
      "Rozkład szkolny — dane o dowozach i odwozach prezentowane na podstawie źródła wskazanego w Serwisie (szkolaolimpijczykow.pl),",
      "Rozkład MZK — wybrane dane komunikacji miejskiej prezentowane na podstawie danych GTFS MZK Zielona Góra,",
      "Plan lekcji — lokalna konfiguracja Użytkownika (miejsce / przystanek oraz godziny w dni robocze) służąca do dopasowania kursów,",
      "Web Push — powiadomienia przeglądarkowe dostępne przy aktywnym Planie Plus, które Użytkownik może włączyć dobrowolnie,",
      "Transfer ustawień — przeniesienie wybranych ustawień między urządzeniami za pomocą kodu QR lub kodu tekstowego,",
      "PWA — możliwość dodania Serwisu do ekranu początkowego / zainstalowania jako aplikacji internetowej; nie jest wymagana do korzystania z rozkładów i pozostałych funkcji w przeglądarce,",
      "Stripe — dostawca płatności obsługujący Checkout za Plan Plus.",
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
      "opcjonalne logowanie e-mailem (magic link / kod) oraz zarządzanie kontem na stronie profilu,",
      "opcjonalny zakup Planu Plus,",
      "transfer ustawień między urządzeniami (kod QR / kod tekstowy),",
      "powiadomienia Web Push przy aktywnym Planie Plus (włączane dobrowolnie przez Użytkownika),",
      "dodanie Serwisu do ekranu początkowego (PWA) — wyłącznie dla wygody; nie jest wymagane do przeglądania rozkładów,",
      "przesyłanie opinii za pomocą formularza w Serwisie oraz — przy aktywnym Planie Plus — reklamacji dotyczących tej usługi.",
    ],
    afterBullets: [
      "Serwis działa w pełni w przeglądarce internetowej. Instalacja PWA nie jest warunkiem korzystania z Usługi. Niedostępność poszczególnych funkcji może wynikać z ograniczeń przeglądarki lub systemu Użytkownika (np. brak obsługi Web Push) albo z chwilowej niedostępności danych źródłowych.",
      "Serwis nie świadczy usług przewozu, rezerwacji miejsc, sprzedaży biletów ani obsługi reklamacji transportowych wobec przewoźnika.",
    ],
  },
  {
    id: "konto",
    title: "§4 Konto i logowanie",
    paragraphs: [
      "Konto jest opcjonalne. Logowanie odbywa się adresem e-mail bez hasła: Usługodawca wysyła jednorazowy link oraz 6-cyfrowy kod (ważne przez ograniczony czas).",
      "Na części urządzeń (zwłaszcza iOS PWA) link z poczty może otworzyć się w innej przeglądarce niż zainstalowana aplikacja. W takiej sytuacji kod należy wpisać w aplikacji / oknie, w którym ma powstać sesja.",
      "Sesja jest utrzymywana za pomocą ciasteczka opisanego w Polityce prywatności. Jedno konto może być zalogowane na wielu urządzeniach naraz. Wylogowanie kończy tylko bieżącą sesję na danym urządzeniu.",
      "Użytkownik odpowiada za dostęp do skrzynki e-mail użytej do logowania. Usługodawca może limitować liczbę żądań logowania, aby ograniczyć nadużycia.",
    ],
  },
  {
    id: "plan-plus",
    title: "§5 Plan Plus",
    paragraphs: [
      "Plan Plus jest opcjonalną, płatną funkcją Serwisu. Zakup wymaga uprzedniego zalogowania.",
      "Cena prezentowana w Serwisie (obecnie 30 zł) dotyczy jednorazowej opłaty za dostęp do Planu Plus na rok szkolny. Plan nie odnawia się automatycznie. Po wygaśnięciu Użytkownik może kupić kolejny plan na stronie profilu.",
      "Rok szkolny Planu Plus kończy się 31 sierpnia (kalendarz Europe/Warsaw), zgodnie z regułami opisanymi w Serwisie przy zakupie. Data ważności jest widoczna w profilu po aktywacji.",
      "Płatność obsługuje Stripe Checkout. Po opłaceniu Użytkownik wraca do Serwisu; aktywacja Planu Plus następuje po potwierdzeniu płatności (webhook). Do czasu potwierdzenia Serwis może pokazywać stan „płatność w toku”.",
      "Przed rozpoczęciem płatności Użytkownik potwierdza w Serwisie, że chce, aby świadczenie usługi rozpoczęło się od razu po dokonaniu płatności, oraz że przyjmuje do wiadomości utratę prawa odstąpienia od umowy po rozpoczęciu świadczenia — w zakresie przewidzianym przepisami o konsumentach.",
      "Usługodawca nie gwarantuje nieprzerwanej dostępności funkcji Plus (w tym powiadomień) w razie awarii infrastruktury lub ograniczeń po stronie przeglądarki / dostawcy Push.",
      "W razie problemu z działaniem Planu Plus Użytkownik może zgłosić reklamację z poziomu profilu (przy aktywnym Planie Plus) albo na adres e-mail Usługodawcy.",
    ],
  },
  {
    id: "warunki-techniczne",
    title: "§6 Warunki techniczne korzystania z Serwisu",
    paragraphs: [
      "Do korzystania z Serwisu potrzebne są w szczególności:",
    ],
    bullets: [
      "urządzenie z dostępem do Internetu,",
      "aktualna przeglądarka internetowa z włączoną obsługą JavaScript,",
      "dla funkcji lokalnych — możliwość zapisu danych w pamięci przeglądarki (localStorage),",
      "dla konta — dostęp do skrzynki e-mail oraz możliwość przyjęcia ciasteczka sesji,",
      "dla Planu Plus — możliwość przekierowania do Stripe Checkout.",
    ],
    afterBullets: [
      "Serwis można dodać do ekranu początkowego lub zainstalować jako aplikację internetową (PWA), jeśli przeglądarka i system Użytkownika na to pozwalają. Instalacja PWA nie jest wymagana — rozkłady, plan lekcji, transfer ustawień i formularz opinii działają także bez niej, bezpośrednio w przeglądarce.",
      "Powiadomienia Web Push wymagają aktywnego Planu Plus, przeglądarki i systemu obsługujących Push oraz zgody Użytkownika. Na części urządzeń (np. iPhone) system może wymagać uprzedniego dodania Serwisu do ekranu początkowego, zanim powiadomienia będą dostępne — dotyczy to wyłącznie powiadomień, a nie korzystania z pozostałych funkcji Serwisu.",
      "Transfer ustawień za pomocą kodu QR jest wygodniejszy przy użyciu aparatu do zeskanowania kodu; nie jest to wymóg — kod tekstowy można wpisać ręcznie na stronie przywracania ustawień.",
      "Usługodawca dokłada starań, aby Serwis działał poprawnie w popularnych, aktualnych przeglądarkach, lecz nie gwarantuje pełnej zgodności z każdą konfiguracją sprzętową i programową.",
    ],
  },
  {
    id: "rozklady",
    title: "§7 Zasady korzystania z rozkładów",
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
    title: "§8 Personalizacja i plan lekcji",
    paragraphs: [
      "Użytkownik może utworzyć plan lekcji (miejsce / przystanek oraz godziny rozpoczęcia, a opcjonalnie zakończenia lekcji w dni robocze) oraz ustawić powiązane preferencje, np. okno czasowe dopasowania kursów czy wybraną trasę MZK.",
      "W zwykłym korzystaniu z Serwisu (bez włączonych powiadomień Web Push) plan lekcji i powiązane ustawienia są przechowywane lokalnie w przeglądarce Użytkownika (localStorage) i służą do dopasowania wyświetlanych kursów oraz wydruku planu.",
      "Jeżeli Użytkownik włączy powiadomienia Web Push (przy aktywnym Planie Plus), część danych planu niezbędna do przygotowania przypomnień jest przesyłana i przechowywana po stronie serwera Usługodawcy — wyłącznie w celu realizacji powiadomień. Różnica polega na tym, że bez Push plan pozostaje na urządzeniu; z włączonym Push wybrany zakres danych planu trafia na serwer.",
      "Usługodawca nie wymaga konta do korzystania z lokalnego planu lekcji. Konto jest wymagane do Planu Plus i powiadomień. Użytkownik odpowiada za poprawność wprowadzonych przez siebie godzin i miejsca.",
    ],
  },
  {
    id: "web-push",
    title: "§9 Powiadomienia Web Push",
    paragraphs: [
      "Powiadomienia Web Push są funkcją Serwisu dostępną przy aktywnym Planie Plus i włączaną dobrowolnie. Użytkownik włącza je samodzielnie i musi wyrazić zgodę w mechanizmie powiadomień przeglądarki lub systemu.",
      "Włączenie powiadomień wymaga zalogowania, aktywnego Planu Plus oraz wcześniej ustawionego miejsca oraz godzin w planie lekcji. Po zapisaniu subskrypcji Serwis może wysłać krótkie potwierdzenie włączenia. Użytkownik może także zamówić powiadomienie testowe.",
      "Aktualnie przypomnienia dotyczą autobusu szkolnego, a nie kursów MZK. Użytkownik może wybrać rodzaje powiadomień:",
    ],
    bullets: [
      "przypomnienie o odjeździe do szkoły — około 20 minut przed dopasowanym kursem,",
      "przypomnienie o autobusie powrotnym — około 20 minut przed odjazdem ze szkoły (gdy w planie podano godzinę końca lekcji),",
      "informacja o zmianie godzin w rozkładzie szkolnym (gdy wykryta zostanie aktualizacja treści rozkładu).",
    ],
    afterBullets: [
      "W celu realizacji powiadomień Serwis przechowuje na serwerze m.in.: subskrypcję Push (endpoint oraz klucze techniczne potrzebne do dostarczenia powiadomienia), powiązanie z kontem, dane planu niezbędne do wyliczenia przypomnień, wybrane rodzaje powiadomień oraz dane techniczne ograniczające powtórzenia (np. lista już wysłanych przypomnień danego dnia) i skrót treści rozkładu szkolnego.",
      "Rekordy powiadomień na serwerze nie mają w aplikacji automatycznego terminu ważności (TTL). Użytkownik przestaje otrzymywać powiadomienia, wyłączając je w Serwisie (lub cofając zgodę w ustawieniach przeglądarki / systemu), a także gdy Plan Plus wygaśnie lub zostanie cofnięty. Serwis usuwa rekord subskrypcji także wtedy, gdy dostawca kanału Push zgłosi, że subskrypcja jest nieaktualna.",
      "Dostarczenie powiadomienia zależy od przeglądarki, systemu, dostawcy Push oraz dostępności infrastruktury (w tym harmonogramu wysyłki). Usługodawca nie gwarantuje, że każde przypomnienie dotrze w oczekiwanej chwili.",
    ],
  },
  {
    id: "transfer",
    title: "§10 Transfer ustawień między urządzeniami",
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
    title: "§11 Formularz opinii",
    paragraphs: [
      "Użytkownik może przesłać opinię za pomocą formularza dostępnego w Serwisie. Treść wiadomości jest wymagana (do 2000 znaków). Adres e-mail zwrotny jest opcjonalny.",
      "Zabrania się przesyłania treści bezprawnych, obraźliwych, spamowych, zawierających złośliwe oprogramowanie lub naruszających prawa osób trzecich.",
      "W celu ograniczenia nadużyć Serwis stosuje mechanizm antybotowy Cloudflare Turnstile, ukryte pole kontrolne oraz limit liczby wiadomości z jednego adresu IP.",
      "Wiadomość trafia do Usługodawcy za pośrednictwem usługi pocztowej (Resend). Podanie e-maila umożliwia odpowiedź; nie jest wymagane do wysłania opinii.",
    ],
  },
  {
    id: "prawa-obowiazki",
    title: "§12 Prawa i obowiązki Użytkownika",
    paragraphs: [
      "Użytkownik może korzystać z Serwisu zgodnie z jego przeznaczeniem oraz obowiązującym prawem.",
      "Użytkownik zobowiązuje się w szczególności do:",
    ],
    bullets: [
      "podawania w planie lekcji i formularzach danych zgodnych z zamiarem korzystania z funkcji Serwisu,",
      "nieudostępniania kodów transferowych ani kodów logowania osobom nieuprawnionym,",
      "nierozpowszechniania za pośrednictwem formularza opinii treści bezprawnych,",
      "nierozpoczynania prób nieautoryzowanego dostępu do Serwisu, jego infrastruktury ani danych innych Użytkowników,",
      "nieobchodzenia zabezpieczeń technicznych ani limitów zapytań,",
      "nieprzeprowadzania ataków na API, nie przeciążania Serwisu nadmierną liczbą żądań ani niegenerowania automatycznie nadmiernego ruchu,",
      "niewykorzystywania wykrytych błędów w sposób szkodliwy dla Usługodawcy lub innych Użytkowników.",
    ],
    afterBullets: [
      "W razie naruszenia powyższych zasad Usługodawca może ograniczyć dostęp do funkcji Serwisu w zakresie niezbędnym do ochrony bezpieczeństwa i ciągłości działania (np. limity zapytań, odmowa przyjęcia żądania, zakończenie sesji).",
    ],
  },
  {
    id: "odpowiedzialnosc",
    title: "§13 Odpowiedzialność i aktualność informacji",
    paragraphs: [
      "Usługodawca dokłada należytej staranności, aby Serwis działał poprawnie i prezentował dane na podstawie dostępnych źródeł, jednak rozkłady mają charakter informacyjny i pomocniczy.",
      "Usługodawca nie ponosi odpowiedzialności za skutki oparcia się wyłącznie na informacji z Serwisu bez weryfikacji u właściwego przewoźnika, szkoły lub organizatora transportu — w szczególności za spóźnienie, odwołanie kursu, zmianę rozkładu lub inną niedogodność transportową leżącą poza Serwisem.",
      "Usługodawca nie gwarantuje, że dopasowanie kursu do planu lekcji będzie zawsze optymalne dla konkretnej sytuacji Użytkownika; wynik zależy od wprowadzonych danych i aktualnej treści rozkładu w Serwisie.",
      "Odpowiedzialność Usługodawcy za działanie transferu ustawień, konta, Planu Plus, powiadomień Web Push i formularza opinii ogranicza się do starannego działania w ramach dostępnej infrastruktury. Nie obejmuje to awarii lub ograniczeń po stronie przeglądarki, systemu Użytkownika, dostawcy Push, dostawcy płatności (Stripe), dostawcy hostingu ani źródeł rozkładów.",
      "Powyższe ograniczenia nie wyłączają odpowiedzialności, której zgodnie z bezwzględnie obowiązującymi przepisami prawa nie można ograniczyć ani wyłączyć — w szczególności wobec konsumentów w zakresie przewidzianym przepisami.",
    ],
  },
  {
    id: "dostepnosc",
    title: "§14 Przerwy techniczne i dostępność Serwisu",
    paragraphs: [
      "Usługodawca dokłada starań, aby Serwis był dostępny, lecz nie zobowiązuje się do określonego poziomu dostępności (SLA).",
      "Dostępność może być ograniczona lub czasowo zawieszona z powodu m.in.:",
    ],
    bullets: [
      "prac konserwacyjnych i aktualizacji,",
      "awarii Serwisu lub infrastruktury hostingowej,",
      "problemów z usługami zewnętrznymi (np. Redis, poczta, Turnstile, Stripe, Analytics),",
      "braku, opóźnienia lub błędu danych źródłowych rozkładów,",
      "problemów z dostawcą powiadomień Push lub harmonogramem wysyłki.",
    ],
    afterBullets: [
      "W miarę możliwości Usługodawca będzie dążył do przywrócenia działania Serwisu, bez gwarancji konkretnego terminu.",
    ],
  },
  {
    id: "reklamacje",
    title: "§15 Reklamacje i kontakt",
    paragraphs: [
      `Reklamacje dotyczące działania Serwisu można zgłaszać na adres e-mail: ${PROVIDER_EMAIL}.`,
      "Przy aktywnym Planie Plus reklamację dotyczącą tej usługi można także zgłosić z poziomu profilu w Serwisie.",
      "W zgłoszeniu warto podać: opis problemu, przybliżony czas wystąpienia, używaną przeglądarkę / urządzenie oraz — jeśli dotyczy — czy problem dotyczy rozkładu, planu lekcji, konta, Planu Plus, transferu, powiadomień czy formularza opinii.",
      "Usługodawca rozpatruje zgłoszenia dotyczące działania Serwisu w rozsądnym terminie i udziela odpowiedzi na wskazany przez Użytkownika adres e-mail (jeżeli został podany) albo na e-mail konta. Reklamacja dotycząca transportu (np. odwołany kurs) powinna być kierowana do właściwego przewoźnika, szkoły lub organizatora transportu.",
      "Niniejszy paragraf nie ogranicza uprawnień konsumenta wynikających z przepisów prawa.",
    ],
  },
  {
    id: "zmiany",
    title: "§16 Zmiany Regulaminu",
    paragraphs: [
      "Usługodawca może zmieniać Regulamin, gdy wymaga tego zmiana funkcji Serwisu, przepisy prawa lub względy bezpieczeństwa i organizacji świadczenia usług.",
      "Aktualna wersja Regulaminu jest zawsze dostępna pod adresem /regulamin. Data ostatniej aktualizacji znajduje się na końcu dokumentu.",
      "Istotna zmiana zakresu usług powinna być odzwierciedlona w treści Regulaminu. Dalsze korzystanie z Serwisu po publikacji nowej wersji oznacza korzystanie na zasadach zaktualizowanego Regulaminu — z zastrzeżeniem uprawnień wynikających z bezwzględnie obowiązujących przepisów.",
    ],
  },
  {
    id: "postanowienia-koncowe",
    title: "§17 Postanowienia końcowe",
    paragraphs: [
      "W sprawach nieuregulowanych w Regulaminie zastosowanie mają przepisy prawa polskiego, w szczególności przepisy o świadczeniu usług drogą elektroniczną oraz — w zakresie danych osobowych — RODO i ustawa o ochronie danych osobowych, a także Polityka prywatności Serwisu.",
      "Jeżeli którekolwiek postanowienie Regulaminu okaże się nieważne lub nieskuteczne, pozostałe postanowienia zachowują moc.",
      "Niniejszy dokument ma charakter regulaminu świadczenia usług drogą elektroniczną i nie stanowi porady prawnej. Postanowienia wymagające indywidualnej oceny prawnej (m.in. dane Usługodawcy, klauzule wobec konsumentów, podstawy odpowiedzialności, rozliczenia podatkowe) powinny zostać zweryfikowane przed publikacją.",
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
        Ostatnia aktualizacja: 30 września 2026
      </p>
    </article>
  );
}
