# Mindful Growth UX Lab

Samodzielny, lokalny workbench do badania i prototypowania UI/UX obok kanonicznego środowiska `dev:verify`.

## Uruchomienie

Z katalogu głównego uruchom `npm run dev:lab`. Verify otworzy się na porcie 5199, a Lab na 5201. `npm run dev:verify` i `npm run dev:lab:ui` pozwalają uruchomić serwery osobno.

`Ctrl+C` zatrzymuje oba serwery. Konflikt któregokolwiek portu kończy cały launcher z czytelnym błędem.

## Zawartość

- **Własne ikony** — `/concepts/icons`: 120 autorskich ikon w wybranym stylu B, sześć kategorii, filtr 36 nowych ikon, wyszukiwanie, rozmiary 16–32 px i pobieranie SVG. Pierwsze porównanie A/B/C pozostaje pod `mode=compare`; ustawienia katalogu są zapisane w URL.
- **Rozwinięty wiersz planu dnia** — `/concepts/today-row-expansion`: zrzut stanu obecnego z Dzisiaj i replika listy, w której po rozwinięciu dysk „dziś” zjeżdża na oś wstęgi ostatnich 7 dni, a ikony z tacki na hover przelatują w lewo w podpisane przyciski pod tytułem (jedno przejście FLIP + wachlarz kropek); tryby wpisu, gęstość wstęgi i decyzje D1–D6; wdrożone do produktu 26.09.2026.
- **Pole „Ścieżki” w Dzisiaj i widok ścieżki** — `/concepts/today-path-panel`: zrzuty obecnego bloku i widoku ścieżki z verify; scena 02 = małe pole w prawej kolumnie (440 px), zawsze przy aktywnej ścieżce, bez rozwijania (wiersz ścieżki → widok, najbliższy krok, praktyki na dziś z tacką, ≤2 stałe akcje; przełączniki: dwie ścieżki, liczba akcji, ułamek tygodnia); scena 03 = dashboard widoku ścieżki („Teraz”, oś kroków z fazami zwijanymi, karty: praktyki, W świecie, Momenty z rozkładami, odpowiedź na wstyd, pomiar, ćwiczenia); decyzje D1–D8; runda 2 po odrzuceniu pełnego rozwinięcia w polu.
- **Krok „Ścieżka” w refleksji tygodnia** — `/concepts/path-week-reflection`: replika kroku 6 rytuału z blokiem ścieżki wstydu jako jedna wyśrodkowana kolumna 46 rem z trzema sekcjami — Zadanie tygodnia · Momenty · Tydzień 3 · Oparcie, każda z eyebrow, zdaniem „o czym to” i pytaniem przy fakcie, którego dotyczy (runda 3; dwie kolumny z rundy 1 i siatki na całą kartę z rundy 2 odrzucone) (fakty: kafel zadania z dyskiem „1/2” i linią, które dni się liczą; wykres „kto przejmował ster” dla dwóch tygodni o stałej szerokości kolumn, obrys szacunku także w cichym tygodniu; „Dopisz” moment (≤ 2: dzień, część, co zamiast) zamiast gołej liczby, dopisane kreskowane; jedno „Szczegóły”; odpowiedzi: dwa pytania, skala pod pytaniem, przełącznik). Tabela 02b: kiedy Moment liczy dzień zadania (reguła per zadanie + cztery nowe odpowiedzi w Momentach). Scenariusze: zapisane / cichy / odłożone, przełącznik zadania i „licznik dzisiejszego mostu”, motyw; `/preview/path-week-reflection` bez pasków Laba. Runda 3b zaakceptowana i WDROŻONA do produktu 11.10.2026 (`QuietWeeklyReflection`, `PathPartsChart compact`, `programTaskBridgeService.taskCountsEntry`, `momentBackfillService`); scena zostaje jako zapis.
- **Ścieżka „Ze wstydu do współczucia” (v3)** — `/concepts/shame-path`: widok ścieżki w gramatyce Dzisiaj/Kalendarza z minimum na wierzchu (karta „Twoja droga”: tygodnie jako wiersze, studnie kroków, w otwartym tygodniu kroki i dwa zwijane wiersze; po prawej TERAZ, POSTĘP = małe wielokrotności części per tydzień + cztery tory pomiaru, liczby tylko w tabeli w Szczegółach; MOJE ZDANIA, ZROZUMIEĆ), blok w refleksji tygodnia i pole w Dzisiaj; sześć scenariuszy; decyzje D1–D6 po rundach 2 (Codex), 3 i 4. **Wdrożone do produktu 05.10.2026** (`src/features/program-path/`, `ProgramDetailView`, blok refleksji, karta w Dzisiaj).
- **Przyciski edytora wpisu i przełącznik Emocje/AI** — `/concepts/journal-editor-actions`: replika edytora Dziennika w szerokości produktu (dok, kontener 1280, siatka 3fr/2fr, żywy picker emocji) z czterema wariantami akcji (obecnie · A stopka w karcie pisania · B akcje w nagłówku · C autozapis) × trzy przełączniki Emocje/AI (dyski w kolumnie środkowej · kapsułka w rzędzie tytułu · rząd jak dziś); „Czat” przeniesiony do sekcji AI jako chmura z intencjami-czipami; decyzje D1–D7; `/preview/journal-editor-actions?variant=d` do zrzutów 1:1. **Wariant D wdrożony do produktu 27.10.2026** (`JournalEditorView`, slot `intro` w `ReflectionCompanionPanel`, guard wyjścia, strzałka → historia).
- **Pola na kartach biblioteki** — `/concepts/object-card-fields`: czy dawać pole pod wykresem nawyku i w rezultatach celu; cztery reguły (obecnie · pole pomiaru · pole pod każdym wykresem · tylko wykres w polu) × nawyk, tracker, cel; przełączniki: cel 2/3 rezultaty, pas pod tytułem w polu, „Pokaż poziomy”; runda 1 — wybrana reguła B, wdrożona do produktu 11.10.2026 (`ObjectsLibraryMeasurementCard`).
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
