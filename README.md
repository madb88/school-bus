# Autobus szkolny

Aplikacja **Autobus szkolny** — śledzenie bezpiecznego dojazdu dzieci do szkoły (Next.js).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- shadcn/ui

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
| `npm run scrape:dowozy` | Pobiera rozkład ze strony szkoły do JSON          |
| `npm run fetch:mzk`     | Pobiera rozkład MZK (GTFS) jako alternatywy kursów |

Snapshot szkolny: `data/dowozy-schedule.json`. Snapshot MZK: `data/mzk-schedule.json`.  
GitHub Actions odpalają oba fetchy o **05:00** i **22:00** (Europe/Warsaw) i commitują zmiany automatycznie.

Źródło MZK: [mzk.zgora.pl/dla-deweloperow](https://www.mzk.zgora.pl/dla-deweloperow) (GTFS).

Trasa MZK (wsiadanie / wysiadanie) ustawia się na stronie `/mzk` i jest używana w trybie **Szkolny + MZK** na rozkładzie.

## Feedback (Resend + Turnstile)

Formularz „Opinia” (przycisk w prawym dolnym rogu) wysyła wiadomość na e-mail przez [Resend](https://resend.com). Adres docelowy nie jest ujawniany w HTML.

1. Skopiuj `.env.example` → `.env.local` i uzupełnij wartości.
2. Utwórz API key w Resend (`RESEND_API_KEY`). Na start `FEEDBACK_FROM_EMAIL` może być `Feedback <onboarding@resend.dev>` (wysyłka tylko na adres konta Resend). Na produkcję zweryfikuj własną domenę.
3. Utwórz widget [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) i ustaw `NEXT_PUBLIC_TURNSTILE_SITE_KEY` oraz `TURNSTILE_SECRET_KEY`.
4. Te same zmienne dodaj w ustawieniach projektu na Vercel.
