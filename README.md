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

| Komenda                 | Opis                                      |
| ----------------------- | ----------------------------------------- |
| `npm run dev`           | Serwer deweloperski                       |
| `npm run build`         | Build produkcyjny                         |
| `npm run start`         | Start po buildzie                         |
| `npm run lint`          | ESLint                                    |
| `npm run scrape:dowozy` | Pobiera rozkład ze strony szkoły do JSON  |

Snapshot trafia do `data/dowozy-schedule.json`. GitHub Action odpala scrape o **05:00** i **22:00** (Europe/Warsaw) i commituje zmiany automatycznie.
