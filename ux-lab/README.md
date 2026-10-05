# Mindful Growth UX Lab

Samodzielny, lokalny workbench do badania i prototypowania UI/UX obok kanonicznego środowiska `dev:verify`.

## Uruchomienie

Z katalogu głównego uruchom `npm run dev:lab`. Verify otworzy się na porcie 5199, a Lab na 5201. `npm run dev:verify` i `npm run dev:lab:ui` pozwalają uruchomić serwery osobno.

`Ctrl+C` zatrzymuje oba serwery. Konflikt któregokolwiek portu kończy cały launcher z czytelnym błędem.

## Zawartość

- **Własne ikony** — `/concepts/icons`: 120 autorskich ikon w wybranym stylu B, sześć kategorii, filtr 36 nowych ikon, wyszukiwanie, rozmiary 16–32 px i pobieranie SVG. Pierwsze porównanie A/B/C pozostaje pod `mode=compare`; ustawienia katalogu są zapisane w URL.
- **Rozwinięty wiersz planu dnia** — `/concepts/today-row-expansion`: zrzut stanu obecnego z Dzisiaj i replika listy, w której po rozwinięciu dysk „dziś” zjeżdża na oś wstęgi ostatnich 7 dni, a ikony z tacki na hover przelatują w lewo w podpisane przyciski pod tytułem (jedno przejście FLIP + wachlarz kropek); tryby wpisu, gęstość wstęgi i decyzje D1–D6; wdrożone do produktu 26.09.2026.
- **Pole „Ścieżki” w Dzisiaj i widok ścieżki** — `/concepts/today-path-panel`: zrzuty obecnego bloku i widoku ścieżki z verify; scena 02 = małe pole w prawej kolumnie (440 px), zawsze przy aktywnej ścieżce, bez rozwijania (wiersz ścieżki → widok, najbliższy krok, praktyki na dziś z tacką, ≤2 stałe akcje; przełączniki: dwie ścieżki, liczba akcji, ułamek tygodnia); scena 03 = dashboard widoku ścieżki („Teraz”, oś kroków z fazami zwijanymi, karty: praktyki, W świecie, Momenty z rozkładami, odpowiedź na wstyd, pomiar, ćwiczenia); decyzje D1–D8; runda 2 po odrzuceniu pełnego rozwinięcia w polu.
- **Ścieżka „Ze wstydu do współczucia” (v3)** — `/concepts/shame-path`: spokojny widok ścieżki w gramatyce Dzisiaj/Kalendarza (karta „Twoja droga” z tygodniami jako wierszami i studniami kroków; po prawej TERAZ, POSTĘP = jeden obraz „Kto przejmuje ster” z siłą i kreską startu + jedna linia + szczegóły w rozwinięciu + pomiar jako zdania, Moje zdania, Zrozumieć z szufladą kart wiedzy), blok w refleksji tygodnia i pole w Dzisiaj; sześć scenariuszy; decyzje D1–D8 po rundach 2 (Codex) i 3.
- **Karta obiektu w edycji** — `/concepts/object-cards`: zrzuty stanu obecnego z verify, replika produkcyjnej karty obok propozycji (jedna kolumna, zdania „Wpis” i „Cel”, pasek okresów, wagi na żądanie) dla nawyku, trackera, rezultatu i intencji we wszystkich trybach wpisu; decyzje D1–D8 do oceny.
- **Research** — zrzuty aktualnej aplikacji, przypięte adnotacje, luki modelu i wzorce zewnętrzne.
- **Mapa systemu** — interaktywna pętla: priorytet → mapa wsparcia → obiekty → Dzisiaj → refleksja → korekta.
- **Kreator priorytetu** — klikalny rytuał od znaczenia po utworzenie wybranych obiektów.
- **Hub priorytetu** — jakościowy progres, relacje wiele-do-wielu, dowody, miesięczne refleksje i coroczne potwierdzenie.
- **Widoki do pracy** — Dzisiaj, tydzień, miesiąc i rok oraz kompletne rytuały planowania/refleksji tygodniowej i miesięcznej. Wariant `sketchbook-v1` spina je jednym językiem wizualnym i progresywnym detalem.
- **Jak rozwijać Lab** — instrukcja dodawania kolejnych scenariuszy.

## Jak dodać kolejny eksperyment

1. Dodaj komponent eksperymentu w `app/src/experiments/`.
2. Zarejestruj wariant w `app/src/lab/registry.ts`.
3. Dodaj notatki UX w `app/src/lab/content.ts`.
4. Dołącz zrzuty do `app/public/research/`, jeżeli eksperyment opiera się na aktualnym UI.
5. Przetestuj główną ścieżkę i wszystkie viewporty zadeklarowane w zakresie eksperymentu, a wynik zapisz w `app/design-qa.md`.

Pełnoekranowy podgląd repliki ma postać `/preview/:viewId/:variantId/:presetId`; parametr `?viewport=mobile` ogranicza scenariusz do 390 px. Jest to również stabilna powierzchnia do automatycznych zrzutów.

## Kontrole przed przekazaniem

Z katalogu `ux-lab/app` uruchom:

```bash
npm run test
npm run build
```

Build automatycznie sprawdza granice importów przed typecheckiem i bundlowaniem.

## Granice izolacji

- Lab importuje tylko statyczne tokeny, czyste narzędzia i allowlistę prezentacyjnych komponentów Vue.
- Dane pochodzą z tego samego dev-only profilu `rich-v1`, który zasila verify, ale stan eksperymentu pozostaje w pamięci Labu.
- Repozytoria, store'y domenowe, Dexie i pełne widoki produktu są zabronione.
- Zrzuty są dowodami badawczymi, nie zależnością wykonawczą produktu.
- Każdy scenariusz powinien działać jako niezależny eksperyment w jednej wspólnej powłoce.

## Najważniejsza decyzja domenowa

Powiązanie obiektu z priorytetem jest osobnym bytem znaczeniowym. Docelowo powinno przechowywać co najmniej rolę, opis wkładu, oczekiwany sygnał, status i historię obowiązywania. Samo `priorityIds[]` nie wystarcza.
