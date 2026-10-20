# Mindful Growth

Lokalna aplikacja Vue 3 do planowania, codziennego działania i refleksji. Dane użytkownika są przechowywane w IndexedDB w jego przeglądarce.

## Aktualny stan

- Nowy obszar planowania (`Planning Next`) jest domyślnym UI dla dnia, tygodnia, miesiąca i roku.
- Starszy interfejs nadal jest dostępny przez `?ui=legacy` jako tymczasowa powierzchnia regresyjna.
- Rytuały tygodniowe i miesięczne łączą planowanie, przypisania, refleksję i dziennik.
- Biblioteka obiektów obejmuje priorytety, cele, rezultaty kluczowe, nawyki, trackery i intencje tygodniowe.
- Dziennik, emocje, ćwiczenia, obszary życia, profil oraz opcjonalne funkcje AI działają na tej samej lokalnej bazie użytkownika.
- `ux-lab/` jest odizolowanym laboratorium prototypów i nie jest częścią produkcyjnego runtime'u.

Indeks dokumentacji (co jest źródłem prawdy, co archiwum): [docs/README.md](docs/README.md).

## Start

Wymagany jest Node.js z npm.

```bash
npm install
npm run dev
```

Aplikacja developerska działa domyślnie pod `http://localhost:5173` i korzysta z prawdziwych lokalnych danych tego originu.

## Bezpieczna weryfikacja i UX Lab

Do testów wizualnych używaj izolowanego konta z deterministycznymi danymi:

```bash
npm run dev:verify   # aplikacja z fixture rich-v1, port 5199
npm run dev:lab      # verify :5199 oraz UX Lab :5201
npm run dev:demo     # konto demo „Julia” z pół rokiem historii, port 5205
```

Nie uruchamiaj seedów ani destrukcyjnych testów E2E na porcie 5173. Szczegóły środowiska znajdują się w [docs/agent-verification.md](docs/agent-verification.md), a instrukcja laboratorium w [ux-lab/README.md](ux-lab/README.md).

## Kontrole jakości

```bash
npm run typecheck
npm run test:run
npm run build
npm run check-locales
npm run lint
npm run format:check
npm run check:design-system
npm run test:e2e:verify
```

Pełne `npm run test:e2e` uruchamia także destrukcyjne scenariusze na osobnym porcie 5183. `npm run lint` tylko raportuje; `npm run lint:fix` stosuje automatyczne poprawki, dlatego przed jego użyciem warto sprawdzić stan worktree.

Kontrole UX Lab:

```bash
npm --prefix ux-lab/app test
npm --prefix ux-lab/app run build
```

## Architektura w skrócie

- `src/domain/` — modele i reguły domenowe.
- `src/repositories/` — interfejsy i implementacje persistence oparte na Dexie.
- `src/services/` — operacje aplikacyjne, zapytania i integracje.
- `src/stores/` — stan Pinia.
- `src/features/planning-next/` — aktualny obszar planowania i rytuałów.
- `src/components/` — współdzielone komponenty produktu.
- `src/views/` i `src/router/` — widoki oraz routing.
- `src/dev/` — wyłącznie developerskie fixture i most weryfikacyjny.
- `e2e/` — scenariusze Playwright.
- `ux-lab/` — niezależny workbench badawczy z własnym buildem i testami.

Główny stos: Vue 3, TypeScript, Vite, Pinia, Vue Router, Dexie, Vitest, Testing Library i Playwright.

## Zasady pracy z danymi

- Dane są lokalne dla originu i konta użytkownika.
- Zmiany schematu wymagają migracji oraz testu zachowania istniejących danych.
- Testowe resety są dozwolone tylko na izolowanych originach 5183 i 5199.
- Funkcje AI wymagają jawnej konfiguracji dostawcy; klucze nie powinny trafiać do repozytorium.
