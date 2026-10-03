/**
 * Polityka prywatności — treść oparta na rzeczywistym kodzie aplikacji.
 *
 * TODO(przed publikacją): uzupełnij dane administratora poniżej
 * (obecnie placeholdery: Jakub Kamiński / kontakt@autobusszkolny.pl).
 */

const ADMIN_NAME = "Jakub Kamiński";
const ADMIN_EMAIL = "kontakt@autobusszkolny.pl";

type Section = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  afterBullets?: string[];
};

const SECTIONS: Section[] = [
  {
    id: "administrator",
    title: "1. Administrator danych",
    paragraphs: [
      // TODO(przed publikacją): potwierdź imię, nazwisko i e-mail administratora
      `Administratorem danych osobowych przetwarzanych w związku z korzystaniem z aplikacji autobusszkolny.pl (Dojazdy do szkoły) jest ${ADMIN_NAME}.`,
      `Kontakt w sprawach prywatności: ${ADMIN_EMAIL}.`,
    ],
  },
  {
    id: "privacy-first",
    title: "2. Jak dbamy o prywatność",
    paragraphs: [
      "Aplikacja służy do przeglądania rozkładów autobusów szkolnych i wybranych kursów MZK, dopasowania ich do planu lekcji oraz — opcjonalnie — przenoszenia ustawień między urządzeniami, logowania do konta, zakupu Planu Plus i włączania przypomnień.",
      "Podstawowe rozkłady i lokalny plan lekcji działają bez konta. Konto (logowanie adresem e-mail) jest opcjonalne i potrzebne do Planu Plus oraz powiązanych funkcji, w tym powiadomień Web Push.",
      "Bez powiadomień plan lekcji pozostaje na Twoim urządzeniu. Po włączeniu powiadomień (wymaga aktywnego Planu Plus) część danych planu jest przechowywana na serwerze, ponieważ jest to konieczne do wysyłania spersonalizowanych przypomnień.",
      "Podanie danych (np. e-mail przy logowaniu lub w formularzu opinii albo włączenie powiadomień) jest dobrowolne.",
    ],
  },
  {
    id: "local-storage",
    title: "3. Dane przechowywane lokalnie w przeglądarce",
    paragraphs: [
      "Aby aplikacja działała bez konta, wybrane ustawienia zapisujemy w pamięci przeglądarki (localStorage) na Twoim urządzeniu. Te dane nie są wysyłane na serwer, dopóki samodzielnie nie skorzystasz z funkcji, które tego wymagają (transfer ustawień albo powiadomienia).",
    ],
    bullets: [
      "plan lekcji (miejsce / przystanek oraz godziny rozpoczęcia i ewentualnie zakończenia lekcji w dni robocze),",
      "preferowane miejsce do filtrowania rozkładu,",
      "okno czasowe dopasowania kursów do planu lekcji,",
      "wybrana trasa komunikacji miejskiej (MZK),",
      "informacja o zamknięciu wskazówek wprowadzających,",
      "wybrany motyw wyglądu (jasny / ciemny),",
      "przy korzystaniu z powiadomień: wybrane rodzaje przypomnień oraz (ewentualnie) informacja o ukryciu banera instalacji aplikacji.",
    ],
    afterBullets: [
      "Dane lokalne są potrzebne do działania spersonalizowanych funkcji aplikacji. Możesz je usunąć, czyszcząc dane witryny w ustawieniach przeglądarki albo usuwając poszczególne ustawienia w aplikacji (np. plan lekcji).",
      "Aplikacja nie używa sessionStorage. Usługi zewnętrzne opisane poniżej mogą stosować własne mechanizmy techniczne — zgodnie ze swoją dokumentacją.",
    ],
  },
  {
    id: "session-cookie",
    title: "4. Ciasteczko sesji logowania",
    paragraphs: [
      "Po zalogowaniu aplikacja ustawia własne ciasteczko sesji potrzebne do utrzymania logowania na tym urządzeniu.",
    ],
    bullets: [
      "nazwa: sb_session,",
      "cel: rozpoznanie zalogowanej sesji (konto Plan Plus / powiadomienia),",
      "czas życia: około 30 dni od ustawienia (Max-Age); po wylogowaniu ciasteczko jest usuwane,",
      "właściwości: HttpOnly, SameSite=Lax; Secure w środowisku produkcyjnym.",
    ],
    afterBullets: [
      "Ciasteczko jest niezbędne do funkcji, o które prosisz przy logowaniu. Nie stosujemy w aplikacji banera zgody na cookies wyłącznie pod to ciasteczko. Nie używamy własnych cookies marketingowych ani reklamowych.",
      "Płatność Planu Plus odbywa się przez przekierowanie do Stripe Checkout (osobna strona dostawcy płatności). Ciasteczka Stripe na ich domenie podlegają polityce Stripe.",
    ],
  },
  {
    id: "account-plus",
    title: "5. Konto, e-mail i Plan Plus",
    paragraphs: [
      "Możesz zalogować się adresem e-mail bez hasła (tzw. magic link: jednorazowy link i 6-cyfrowy kod w wiadomości). E-mail jest identyfikatorem konta.",
      "Przy pierwszym udanym logowaniu tworzymy w magazynie serwera (Upstash Redis) rekord konta powiązany z znormalizowanym adresem e-mail oraz sesję. Jedno konto może mieć wiele sesji na różnych urządzeniach; wylogowanie kończy tylko bieżącą sesję.",
      "Plan Plus to opcjonalna, płatna funkcja (jednorazowa opłata za rok szkolny). Po opłaceniu zapisujemy na serwerze uprawnienie (entitlement) z datą ważności — aby wiedzieć, czy Plan Plus jest aktywny, oraz aby umożliwić funkcje zastrzeżone dla Plus (w tym powiadomienia).",
      "Checkout prowadzi Stripe. Z naszej aplikacji do Stripe trafiają dane potrzebne do płatności (m.in. e-mail konta oraz wewnętrzny identyfikator użytkownika w metadanych zamówienia). Stripe przetwarza dane karty / metody płatności zgodnie ze swoją polityką — nie przechowujemy numeru karty w naszej aplikacji.",
      "Po udanej płatności możemy wysłać na e-mail konta potwierdzenie zakupu (Resend). Przy aktywnym Planie Plus możesz też zgłosić reklamację dotyczącą tej usługi z poziomu profilu.",
    ],
  },
  {
    id: "settings-transfer",
    title: "6. Przenoszenie ustawień (kod / QR)",
    paragraphs: [
      "Możesz przenieść plan lekcji, trasę MZK i okno dopasowania na inne urządzenie za pomocą kodu QR lub krótkiego kodu tekstowego.",
      "Przed zapisem na serwerze dane są szyfrowane algorytmem AES-256-GCM. Na serwerze (Upstash Redis) trafia wyłącznie zaszyfrowany pakiet, powiązany z jednorazowym kodem.",
      "Kod jest ważny przez 15 minut. Możesz najpierw zobaczyć podgląd ustawień — kod zużywa się dopiero po potwierdzeniu przywrócenia (jednorazowe odczytanie i usunięcie). Nieużyty kod wygasa automatycznie po upływie TTL.",
      "Aby ograniczyć nadużycia, serwer limituje liczbę żądań tworzenia i odbierania kodów z jednego adresu IP.",
    ],
  },
  {
    id: "web-push",
    title: "7. Powiadomienia Web Push (opcjonalne)",
    paragraphs: [
      "Powiadomienia są funkcją opcjonalną — uruchamianą dopiero wtedy, gdy o to poprosisz, zezwolisz na nie w przeglądarce i masz aktywny Plan Plus oraz sesję logowania.",
      "Bez powiadomień plan lekcji pozostaje na Twoim urządzeniu. Po włączeniu powiadomień część danych planu jest przechowywana na serwerze, ponieważ jest to konieczne do wysyłania spersonalizowanych powiadomień. Rekord subskrypcji jest powiązany z identyfikatorem konta.",
      "Cel przetwarzania: przypomnienia o odjeździe autobusu szkolnego (ok. 20 minut przed), o autobusie powrotnym (ok. 20 minut przed, gdy podasz godzinę końca lekcji), informacje o zmianie godzin w rozkładzie szkolnym, a także krótkie potwierdzenie włączenia oraz — na żądanie — powiadomienie testowe. Przypomnienia dotyczą autobusu szkolnego, nie kursów MZK.",
    ],
    bullets: [
      "subskrypcja Push z przeglądarki: adres endpointu oraz klucze techniczne (p256dh, auth) potrzebne do zaszyfrowanego dostarczenia powiadomienia,",
      "identyfikator rekordu oparty o skrót (hash) endpointu oraz powiązanie z kontem (userId),",
      "plan lekcji niezbędny do wyliczenia przypomnień (miejsce oraz godziny w dni robocze),",
      "wybrane rodzaje powiadomień (odjazd, powrót, zmiana rozkładu),",
      "dane techniczne do unikania powtórzeń (np. lista już wysłanych przypomnień danego dnia) oraz skrót treści rozkładu szkolnego (do wykrycia zmiany godzin).",
    ],
    afterBullets: [
      "Te dane subskrypcji są danymi technicznymi służącymi do dostarczenia powiadomienia na konkretne urządzenie. W połączeniu z planem lekcji pozwalają wysłać spersonalizowane przypomnienie.",
      "Rekordy powiadomień na serwerze nie mają automatycznego terminu ważności (TTL). Usuwamy je, gdy wyłączysz powiadomienia w aplikacji, gdy Plan Plus wygaśnie lub zostanie cofnięty (np. po zwrocie płatności), albo gdy dostawca Push zgłosi, że subskrypcja jest już nieaktualna (np. odpowiedź 404/410).",
      "Wysyłkę przypomnień uruchamia zaplanowane zadanie (Upstash QStash). Dostawcą kanału Push jest usługa wynikająca z przeglądarki / systemu (adres endpointu), np. Google, Mozilla lub Apple — wyłącznie w zakresie dostarczenia powiadomienia.",
    ],
  },
  {
    id: "feedback",
    title: "8. Formularz „Opinia” i reklamacje Plan Plus",
    paragraphs: [
      "Możesz wysłać opinię przez formularz w aplikacji. Wiadomość (do 2000 znaków) jest wymagana. Adres e-mail zwrotny jest opcjonalny (do 254 znaków).",
      "Aby ograniczyć spam, stosujemy Cloudflare Turnstile (weryfikacja „nie jestem robotem”) oraz limit liczby wiadomości z jednego adresu IP (3 w ciągu 15 minut; licznik w Upstash Redis albo, gdy Redis jest niedostępny, tymczasowo w pamięci serwera).",
      "Adres IP wykorzystujemy wyłącznie do limitu zapytań i weryfikacji Turnstile — nie dołączamy go do treści wiadomości e-mail.",
      "Wiadomość trafia na skrzynkę administratora za pośrednictwem usługi Resend. Jeśli podasz e-mail, ustawiamy go jako adres odpowiedzi (reply-to), żeby można było odpisać.",
      "Przy aktywnym Planie Plus możesz zgłosić reklamację dotyczącą tej usługi z profilu. W takiej sprawie używamy e-maila z sesji konta (nie adresu wpisanego w formularzu reklamacji).",
      "Okres przechowywania wiadomości w skrzynce nie wynika z kodu aplikacji — wiadomości są przechowywane do czasu ich rozpatrzenia i usunięcia przez administratora.",
    ],
  },
  {
    id: "analytics",
    title: "9. Statystyki odwiedzin i wydajności",
    paragraphs: [
      "Korzystamy z Vercel Web Analytics oraz Vercel Speed Insights, wbudowanych w aplikację, aby rozumieć, jak działa serwis i jak go ulepszać (np. popularność stron, podstawowe metryki wydajności).",
      "Według aktualnej dokumentacji Vercel Web Analytics: dane są zbierane w sposób zagregowany, bez third-party cookies; odwiedzający są rozróżniani hashem żądania, a nie trwałym identyfikatorem osobowym. Do punktu danych mogą należeć m.in. znacznik czasu, adres URL / ścieżka, referrer, przybliżona lokalizacja (np. kraj / region / miasto), system i przeglądarka oraz typ urządzenia. Sesja odwiedzającego nie jest przechowywana trwale — według dokumentacji jest odrzucana po 24 godzinach.",
      "Według dokumentacji Vercel Speed Insights: zbierane są anonimowe pomiary wydajności (m.in. trasa i URL, typ urządzenia, przeglądarka, kraj, wybrane Web Vitals), bez wiązania ich z konkretną osobą.",
      "Szczegóły mogą zależeć od aktualnej wersji usług Vercel. Nie stosujemy w aplikacji własnego banera zgody na te narzędzia. Ocena, czy w Twojej sytuacji wymagana jest dodatkowa zgoda, należy do administratora (ew. konsultacja prawna) — niniejszy dokument nie stanowi porady prawnej.",
    ],
  },
  {
    id: "processors",
    title: "10. Odbiorcy danych i podmioty przetwarzające",
    paragraphs: [
      "Dane mogą trafić wyłącznie do podmiotów, których usługi rzeczywiście wykorzystujemy:",
    ],
    bullets: [
      "Vercel — hosting aplikacji oraz Analytics i Speed Insights,",
      "Upstash — Redis (konto, sesja, Plan Plus, transfer ustawień, limity zapytań, rekordy Push) oraz QStash (harmonogram wysyłki przypomnień),",
      "Resend — wysyłka maili logowania, potwierdzeń zakupu, formularza opinii i reklamacji,",
      "Stripe — obsługa płatności za Plan Plus (Checkout i powiązane dane płatności),",
      "Cloudflare — Turnstile przy formularzu opinii,",
      "dostawca Web Push wynikający z endpointu przeglądarki — wyłącznie w celu dostarczenia powiadomienia.",
    ],
    afterBullets: [
      "Część tych dostawców może przetwarzać dane poza Europejskim Obszarem Gospodarczym. Stosują wówczas własne mechanizmy zgodności (np. standardowe klauzule umowne) — szczegóły znajdują się w ich politykach prywatności.",
      "Nie sprzedajemy danych użytkowników.",
    ],
  },
  {
    id: "legal-bases",
    title: "11. Cele i podstawy przetwarzania",
    paragraphs: [
      "Przetwarzamy dane w następujących celach:",
    ],
    bullets: [
      "świadczenie usługi drogą elektroniczną (rozkłady, plan lekcji, transfer ustawień) — art. 6 ust. 1 lit. b RODO (wykonanie umowy / żądanie użytkownika przed zawarciem umowy) albo lit. f (prawnie uzasadniony interes: działanie aplikacji),",
      "konto i sesja logowania (e-mail, ciasteczko sesji) — art. 6 ust. 1 lit. b RODO,",
      "zakup i utrzymanie Planu Plus (entitlement, potwierdzenie płatności) — art. 6 ust. 1 lit. b RODO,",
      "opcjonalne powiadomienia Push — art. 6 ust. 1 lit. a RODO (zgoda; możesz ją wycofać, wyłączając powiadomienia) oraz w powiązaniu z umową Planu Plus lit. b,",
      "formularz opinii i reklamacje — art. 6 ust. 1 lit. a lub f albo b RODO (zgoda / prawnie uzasadniony interes / wykonanie umowy),",
      "bezpieczeństwo i ograniczenie nadużyć (limity IP, Turnstile) — art. 6 ust. 1 lit. f RODO,",
      "statystyki i wydajność (Vercel Analytics / Speed Insights) — art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes: utrzymanie i rozwój serwisu), z zastrzeżeniem oceny administratora co do ewentualnej zgody.",
    ],
  },
  {
    id: "retention",
    title: "12. Okresy przechowywania",
    paragraphs: [
      "Dane lokalne w przeglądarce: do czasu ich usunięcia przez Ciebie lub wyczyszczenia danych witryny.",
      "Konto (e-mail, identyfikator): do czasu usunięcia konta na żądanie albo do czasu, gdy przestaniemy świadczyć usługę konta — obecnie w aplikacji nie ma samoobsługowego usuwania konta; możesz napisać do administratora.",
      "Sesja logowania (Redis + ciasteczko): około 30 dni od ostatniego odświeżenia sesji albo do wylogowania.",
      "Uprawnienie Plan Plus (entitlement): do końca okresu ważności oraz w zakresie potrzebnym do rozliczeń / reklamacji; przy zwrocie płatności status jest aktualizowany.",
      "Transfer ustawień (zaszyfrowany kod): do 15 minut albo do jednorazowego wykorzystania — w zależności od tego, co nastąpi wcześniej.",
      "Liczniki limitów zapytań (IP): krótkotrwale, zgodnie z oknem limitu (rzędu kilkudziesięciu minut).",
      "Rekordy Web Push: do wyłączenia powiadomień, wygaśnięcia / cofnięcia Planu Plus lub unieważnienia subskrypcji przez dostawcę Push — bez automatycznego TTL w aplikacji.",
      "Wiadomości z formularza opinii i reklamacji: do rozpatrzenia i usunięcia przez administratora (brak sztywnego terminu w kodzie).",
      "Dane Analytics / Speed Insights: zgodnie z polityką i konfiguracją Vercel.",
    ],
  },
  {
    id: "rights",
    title: "13. Twoje prawa",
    paragraphs: [
      "W zakresie przewidzianym przez RODO możesz żądać: dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia danych, a także wniesienia sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie. Zgodę (np. na powiadomienia) możesz wycofać w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania sprzed wycofania.",
      "Aby skorzystać z praw, napisz na adres kontaktowy administratora. Masz też prawo wnieść skargę do organu nadzorczego — w Polsce jest to Prezes Urzędu Ochrony Danych Osobowych (UODO), ul. Stawki 2, 00-193 Warszawa, https://uodo.gov.pl.",
    ],
  },
  {
    id: "voluntary",
    title: "14. Dobrowolność i zmiany",
    paragraphs: [
      "Korzystanie z podstawowych rozkładów nie wymaga podawania danych osobowych. Plan lekcji i ustawienia lokalne są dobrowolne. Konto, Plan Plus, transfer, powiadomienia i formularz opinii także są opcjonalne — bez nich część funkcji będzie niedostępna, ale rozkład nadal możesz przeglądać.",
      "Politykę możemy aktualizować, gdy zmieni się aplikacja lub przepisy. Aktualna wersja jest zawsze dostępna pod adresem /polityka-prywatnosci. Data ostatniej aktualizacji znajduje się poniżej.",
      "Niniejszy dokument ma charakter informacyjny i nie stanowi porady prawnej.",
    ],
  },
];

export function PrivacyPolicyContent() {
  return (
    <article className="animate-rise-delay-2 space-y-10 sm:space-y-12">
      {SECTIONS.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={
            index > 0 ? "space-y-3 border-t border-border/50 pt-10 sm:pt-12" : "space-y-3"
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
