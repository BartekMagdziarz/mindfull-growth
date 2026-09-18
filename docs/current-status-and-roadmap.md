# Stan projektu i roadmapa powrotu

Aktualizacja: 2026-08-15. Ten dokument jest krótkim, bieżącym punktem wejścia. Starsze dokumenty w `docs/` zachowują historię decyzji i bardziej szczegółowe backlogi, ale nie zawsze opisują aktualny interfejs.

## Co jest obecnie źródłem prawdy

- `Planning Next` jest domyślnym interfejsem tras `/today/:dayRef` (Dzisiaj — własny widok dnia bez przełącznika skal, `TodayWorkspace`), `/calendar/week`, `/calendar/month` i `/calendar/year` (kalendarz rytmu). `/calendar/day/:dayRef` tylko przekierowuje do `/today/:dayRef`; `/calendar` otwiera bieżący tydzień (od 2026-09-10).
- `?ui=legacy` otwiera poprzedni interfejs. Pozostaje potrzebny do regresji i porównania do czasu jawnej decyzji o jego usunięciu.
- `src/dev/verificationSeed.ts` i profil `rich-v1` są źródłem realistycznego, powtarzalnego stanu do QA.
- `ux-lab/app` jest odizolowanym workbenchem projektowym. Wybrane rozwiązania należy portować do produktu, a nie importować z niego runtime'u laboratorium.
- `docs/planning-reflection-roadmap.md` opisuje historię i szczegóły pętli planowanie–refleksja; poniższa lista ma pierwszeństwo jako kolejność najbliższej pracy.

## Design V2 na całej aplikacji (2026-09-10)

- Korzeń `.mg-design-v2` przeniesiony na `<main>` powłoki; `AppCard`/`AppButton` renderują anatomie V2, brakujące klasy `neo-*` mostkuje `adapters.css`. Dzięki temu 35 widoków ćwiczeń, 40 kreatorów, profil, historia, obszary życia, logowanie i czat czytają się jako V2 bez przepisywania treści.
- Nowe współdzielone elementy: `PageHeader`, `ExercisePage`, `ExerciseStepper`, anatomie `page-head / section-head / sheet / icon-board / tile / stepper` w `src/design-system/base.css`.
- Plan i recepta stylu „rysunkowego”: `ideas/html-plans/2026-09-10-design-v2-remaining-views.html`. Screenshoty QA: `ideas/qa/v2shots/` (skrypt `ideas/qa/v2shots.mjs` na `dev:verify`).
- Otwarte: zamiana 34 kopii wskaźnika kroków w kreatorach na `ExerciseStepper` (mechanicznie), usunięcie martwych klas `neo-*` z `main.css` po zaniku konsumentów, martwe widoki `JournalView`/`EmotionsView` (nieroutowane) do usunięcia w osobnej zmianie.

## Co zostało domknięte podczas porządkowania

- zabezpieczono zastany worktree kopią w stashu;
- oddzielono kod i trwałe materiały UX Lab od cache'y, buildów i wygenerowanych zrzutów QA;
- ustabilizowano zależne od daty testy UX Lab;
- dopasowano scenariusze Playwright do domyślnego `Planning Next`, zachowując osobny coverage legacy;
- dodano testy brakującego wiersza dnia dla trybów multi-completion, counter i value;
- zweryfikowano typecheck, build, testy jednostkowe, guardy projektu i oba buildy laboratorium.

## Audyt dawnych gałęzi

- `feat/weekly-matrix-redesign` jest już w całości zawarta w aktualnej historii i nie wymaga odzyskiwania.
- `codex/week-v2` zawiera jeden samodzielny eksperyment starego renderera tygodnia. Planning Next oraz
  warianty tygodnia w UX Lab zastąpiły jego kierunek architektoniczny, dlatego commit nie jest scalany.
  Zdalna gałąź może pozostać czasowo jako archiwum do porównań wizualnych.
- Aktywnym kierunkiem rozwoju jest jeden wspólny `Planning Next`; nie należy tworzyć kolejnego
  równoległego `week-v3` ani `month-v3` poza krótkotrwałym eksperymentem w UX Lab.

## Następna kolejność prac

### 1. Domknąć obecny cutover UI

- Przejść ręczny scenariusz dzień → tydzień → miesiąc → rok na `dev:verify` i zapisać tylko istotne regresje.
- Sprawdzić rytuały otwierania oraz zamykania tygodnia i miesiąca, w tym powrót do wcześniejszego kroku i odświeżenie strony.
- Ustalić kryteria usunięcia `?ui=legacy`: brak krytycznych luk funkcjonalnych, komplet scenariuszy E2E i zatwierdzona migracja nawigacji.
- Po spełnieniu kryteriów usunąć legacy w osobnej zmianie, nie przy okazji kolejnego redesignu.

### 2. Wybrać kolejny port z UX Lab

Rekomendowany porządek:

1. **Zrobione (2026-09-05 → 2026-09-06): port widoku dnia „Dzisiaj” v19 („Scena w wierszu”)** — plan w `ideas/html-plans/2026-09-05-today-v19-inline-stage-port.html`, fazy F0–F4. Zakres: scena w wierszu listy dnia, jeden plus z kaskadą typ → obiekt, Cofnij dla operacji planistycznych, prawa kolumna kalendarz + Kompas + „Najbliżej” w miejsce planszy `NextDayStage`. Status faz:
   - F0 (refaktor bez zmiany wyglądu): `useDayWellness`, `buildDayChartPoints`, `priorityIds` na pozycji dnia, ton `rose` zamiast `mint`, `NextObjectChartCard bare` — **zrobione**;
   - F1 (scena w wierszu): `NextDayItemRow` z propsami `staged/lit/dim`, tacą ikon na hover/fokus i slotem rozszerzenia; `NextDayRail` ze sceną (pierwsza otwarta pozycja, klik przenosi), włoskowym paskiem postępu, zwijaniem wykonanych (preferencja `preferences.today.collapseCompleted`), Cofnij dla ukryć i przeniesień (`today.store.undoLast`, snackbar z akcją, 7 s) — **zrobione**; „Dzień” tymczasowo przez natywny picker w liście;
   - F2 (prawa kolumna): `NextDayEntriesBar` nad listą, `NextDayCalendarCard` (data, strzałki, rozwijany tydzień/miesiąc ze znacznikami terminów i rytuałów, tryb „Wybierz dzień” zamiast natywnego pickera), `NextDayCompass` (priorytety fokusu miesiąca + top-3 tygodnia, hover/przypięcie podświetla wiersze), `NextDayUpcoming` + `dayUpcomingQueries` (terminy celów i rytuały poprzedni/bieżący/następny tydzień i miesiąc ze stanem `due|done`; 2026-09-12: przeterminowane na wierzchu z „po terminie”, zrobione-a-minione w zwiniętym „Minione”, refleksje jako „Podsumuj…”, limit 4 + „Jeszcze n”, plan w `ideas/html-plans/2026-09-12-today-upcoming-states.html`), `NextDayPrograms` (Powtórki/Ścieżki tylko gdy coś należne); przenoszenie między tygodniami idzie przez `toggleMeasurementDayAssignment`; plansza `NextDayStage` usunięta — **zrobione**;
   - F3 (dodawanie i przenoszenie): jeden plus w nagłówku „Plan dnia” (`NextDayAddMenu`, kaskada typ → obiekt z hovera lub przypięcia; kandydaci = `TodayViewBundle.addCandidates`: obiekty zaplanowane w tym tygodniu na inne dni albo nieobecne w tygodniu/miesiącu, KR tylko z otwartym celem); „Jutro”/„Dzień” dla pozycji kontekstowych przez `rescheduleContextItem` (ukrycie dziś + przypisanie dnia docelowego tylko gdy zakres go nie obejmuje); intencje tygodnia nie opuszczają swojego tygodnia; Cofnij dla obu; blok e2e dnia w `verification-smoke` — **zrobione**;
   - F4 (domknięcia): taca ikon poza kolejnością Tab (tytuł wiersza = tab-stop, → wchodzi do tacy, ←/→ po niej, Esc wraca), dni przeszłe = zapis (wpisy edytowalne, przenoszenie/ukrywanie/plus wyłączone), kalendarz zawsze znaczy prawdziwe „dziś” obok wybranego dnia — **zrobione**. Port zakończony 2026-09-06; QA w `design-qa-archive.md` („Dzisiaj v19 → Planning Next”). Odłożone do Priority Hub: relacje `PriorityLink` w Kompasie, karta obiektu zamiast biblioteki pod „Otwórz”, tworzenie intencji z plusa.
   Realizuje punkt „focus hierarchy dla widoku dnia” (Kompas = priorytety miesiąca + fokusy tygodnia).
2. Priority Hub — potrzebny do czytelnego pokazania jakościowego postępu i relacji wiele-do-wielu;
3. docelowy model powiązania obiekt–priorytet — osobny byt z rolą, wkładem, sygnałem i historią obowiązywania;
4. dalsze ujednolicenie rytuałów tygodnia i miesiąca.

Przed portem należy wybrać jeden wariant w Labie, spisać kryteria akceptacji i przenosić pionowy fragment z testami, zamiast kopiować cały prototyp.

### 3. Spłacić znany dług funkcjonalny

- Intencja tygodniowa → priorytet: dane istnieją, ale produkcyjny picker nadal wymaga weryfikacji/domknięcia.
- Tygodniowy rytuał: widoczny status zapisu i serializacja szybkich zmian top-3.
- Miesięczna konfrontacja fokusu: upewnić się, że agregat tygodni jest czytelny również dla elementów bez powiązania.
- `successNote`: pokazać kryterium sukcesu w refleksji obiektowej, nie tylko w planowaniu.
- Zdecydować, czy alternatywny widok Strumień pozostaje osobną perspektywą, czy zostaje wchłonięty przez Planning Next.

### 4. Utrzymać repo w stanie powrotu

- Każdy pionowy fragment kończyć typecheckiem, testami celowanymi, pełnym `test:run` i właściwym scenariuszem E2E.
- Nie commitować `node_modules`, `.npm-cache`, buildów ani wygenerowanych zrzutów QA.
- Aktualizować ten dokument po zmianie domyślnego UI albo kolejności roadmapy.
- Starsze, rozbudowane plany oznaczać jako historyczne zamiast dopisywać do nich sprzeczne statusy.

## Definition of done dla następnej funkcji

Funkcja jest domknięta, gdy ma spójny model domenowy, zachowanie po odświeżeniu, obsługę pustego i błędnego stanu, testy jednostkowe/integracyjne, scenariusz na izolowanym `dev:verify`, brak nowych błędów konsoli oraz krótką aktualizację tego dokumentu.
