# Przegląd i synchronizacja repozytorium — 2026-09-18

## Stan zastany

- Jedyny lokalny branch i worktree: `main`, HEAD `914ee2b`.
- Po `git fetch origin --prune`: 9 lokalnych commitów przed `origin/main`, bez rozbieżnej historii po stronie remote.
- 165 zmodyfikowanych plików śledzonych i 367 nowych plików; brak stashy i zmian w indeksie.
- Remote: `https://github.com/BartekMagdziarz/mindfull-growth`.

Zacommitowane, ale jeszcze niewysłane prace:

| Commit | Zakres |
| --- | --- |
| `01cad8a` | Przygotowanie widoku dnia do inline stage (F0) |
| `3696461` | Wiersze inline stage (F1) |
| `c06d7ab` | Kolumna kontekstu dnia (F2) |
| `eb71289` | Usunięcie poprzedniego NextDayStage (F2) |
| `c53523f` | Dodawanie do planu i zmiana terminów (F3) |
| `3a25dd0` | Klawiatura, blokada planowania przeszłości i dokumentacja (F4) |
| `54cf94e` | Style panelu dnia i tła |
| `a1d4a33` | Rytuały tygodnia/miesiąca i kalendarz rytmu |
| `914ee2b` | Nadchodzące zdarzenia i stany rytuałów |

## Zachowane zmiany robocze

Zebrano je we wspólny commit, ponieważ aplikacja i UX Lab współdzielą nowe ikony, komponenty prezentacyjne i narzędzia okresów:

- osobny widok Dzisiaj, planowanie przez kalendarz i przeciąganie;
- biblioteka obiektów, filtry, osie czasu i przypisywanie okresów;
- migracja wyglądu aplikacji do Design V2, wspólne nagłówki i elementy ćwiczeń;
- katalog 241 ikon organicznych, SVG i grafiki emocji;
- eksperymenty UX Lab dotyczące kalendarza, działań, rytuałów i szybkiego planowania;
- testy, propozycje UX i dokumentacja decyzji.

Podczas porządkowania przeniesiono kolory/cienie widoku dnia do tokenów design systemu oraz poprawiono selektor testu `NextDayCalendarCard`: tytuł komórki zawiera także daty rytuałów, więc nie identyfikuje jednoznacznie numeru dnia.

## Weryfikacja

| Kontrola | Wynik |
| --- | --- |
| Testy aplikacji (`npm run test:run`) | 225 plików; 2239 testów zaliczonych, 1 pominięty |
| Build aplikacji (`npm run build`) | OK, łącznie z TypeScript |
| Testy UX Lab | 9 plików; 114 testów zaliczonych |
| Build UX Lab | OK, łącznie z TypeScript, eksportem ikon i kontrolą granic importów |
| Klucze tłumaczeń | OK, 28 par plików |
| Kontrola design systemu | OK |
| `git diff --check` | OK |
| Playwright verification | 12 zaliczonych, 5 niezaliczonych |

Buildy zgłaszają ostrzeżenia o dużych chunkach. Przegląd obejmował stan Git, zakres zmian, wybrane zależności i automatyczne kontrole; nie stanowi pełnego audytu każdej funkcji ani pełnej oceny wizualnej.

## Otwarte wyniki E2E

Nie wyłączono ani nie osłabiono poniższych testów. Wymagają osobnego dopasowania do aktualnego UI i sprawdzenia zachowania:

- `verification-month-v2.spec.ts`: test responsywności, asercja `weekStripScrolls` na mobile zwraca `false` zamiast `true`.
- `verification-multi-completion.spec.ts`: refleksja tygodniowa oczekuje nieobecnego selektora `.next-ritual`.
- `verification-smoke.spec.ts`: refleksja miesięczna oraz tygodniowa również oczekują `.next-ritual`; zapisany widok błędu miesiąca pokazuje już nowy interfejs rytuału.
- `verification-smoke.spec.ts`: test dnia oczekuje jednego `.ndi--staged` od razu po otwarciu, aktualny widok zwraca zero.

## Pliki lokalne poza Git

Zachowano istniejące reguły ignorowania i pliki lokalne, w tym `ideas/`, zależności, buildy, raporty testów, zrzuty QA i prototypy. Czysty worktree oznacza brak zmian śledzonych i nieignorowanych nowych plików; nie oznacza usunięcia lokalnych materiałów ignorowanych przez Git.
