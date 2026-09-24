# Autobus szkolny

Aplikacja **Autobus szkolny** — śledzenie bezpiecznego dojazdu dzieci do szkoły (Next.js).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui

Wersja aplikacji (`package.json` → pole `version`) jest pokazywana w stopce. Przy większych zmianach user-facing podbij semver (np. `0.2.0` → `0.3.0`).

## Uruchomienie lokalne

```bash
npm install
npm run dev -- --port 43123
```

Otwórz [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Skrypty

| Komenda                 | Opis                                              |
| ----------------------- | ------------------------------------------------- |
| `npm run dev`           | Serwer deweloperski                               |
| `npm run build`         | Build produkcyjny                                 |
| `npm run start`         | Start po buildzie                                 |
| `npm run lint`          | ESLint                                            |
| `npm test`              | Testy jednostkowe (Vitest)                        |
| `npm run scrape:dowozy` | Pobiera rozkład ze strony szkoły do JSON          |
| `npm run fetch:mzk`     | Pobiera rozkład MZK (GTFS) jako alternatywy kursów |

Snapshot szkolny: `data/dowozy-schedule.json`. Snapshot MZK: `data/mzk-schedule.json`.  
GitHub Actions odpalają oba fetchy raz dziennie o **06:00** (Europe/Warsaw) i commitują zmiany automatycznie. Workflowy scrape/fetch kończą się błędem przy pustym snapshocie (GitHub powiadamia watcherów repo). CI na PR uruchamia lint, testy i build.

Źródło MZK: [mzk.zgora.pl/dla-deweloperow](https://www.mzk.zgora.pl/dla-deweloperow) (GTFS).

Trasa MZK (wsiadanie / wysiadanie) ustawia się na stronie `/mzk` i jest używana w trybie **Szkolny + MZK** na rozkładzie.

## Feedback (Resend + Turnstile)

Formularz „Opinia” (przycisk w prawym dolnym rogu) wysyła wiadomość na e-mail przez [Resend](https://resend.com). Adres docelowy nie jest ujawniany w HTML.

1. Skopiuj `.env.example` → `.env.local` i uzupełnij wartości.
2. Utwórz API key w Resend (`RESEND_API_KEY`). Na start `FEEDBACK_FROM_EMAIL` może być `Feedback <onboarding@resend.dev>` (wysyłka tylko na adres konta Resend). Na produkcję zweryfikuj własną domenę.
3. Utwórz widget [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) i ustaw `NEXT_PUBLIC_TURNSTILE_SITE_KEY` oraz `TURNSTILE_SECRET_KEY`.
4. (Opcjonalnie) dodaj `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`, żeby limit opinii działał trwale na serverless **oraz** żeby działał transfer ustawień kodem QR (`/przywroc`). Bez tego używany jest limit opinii w pamięci procesu, a transfer między urządzeniami zwraca 503.
5. (Opcjonalnie) ustaw `NEXT_PUBLIC_SITE_URL` na kanoniczny adres produkcji (SEO / sitemap).
6. Te same zmienne dodaj w ustawieniach projektu na Vercel.

## Transfer ustawień (QR)

Na stronie **Plan lekcji** przycisk „Przenieś na telefon” tworzy jednorazowy kod (TTL 15 min) w Upstash Redis. Drugie urządzenie skanuje QR albo otwiera `/przywroc` i wpisuje kod — plan lekcji, trasa MZK i okno dopasowania trafiają do `localStorage`.
