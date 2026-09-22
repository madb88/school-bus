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
