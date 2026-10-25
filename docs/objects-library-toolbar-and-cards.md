# Biblioteka obiektów — belka narzędzi i karty (2026-09-12)

Źródło prawdy dla wyglądu i zachowania widoku `/objects/:family`. Plan
i mockupy: `ideas/html-plans/2026-09-12-objects-library-toolbar-and-cards.html`
(artefakt lokalny). Anatomie CSS: `src/design-system/base.css`, notki w
`src/design-system/README.md`.

## Decyzje

- **D1 Belka w jednym rzędzie.** Lewa grupa: „+” i segmenty rodzin. Prawa
  grupa o wysokości pigułki (2rem): pole „Szukaj” (12rem, 16rem po fokusie
  lub z wartością), chip „Okres”, chip „Filtry”. Ustawiony filtr = ton
  primary na papierze bez cienia; pusty = wyciszony.
- **D2 Okres = rok albo miesiąc.** Chip otwiera popover (`ObjectsPeriodSelect`):
  strzałki zmieniają rok, klik w rok wybiera cały rok, siatka 4×3 wybiera
  miesiąc, drugi klik odznacza. Tygodnie i dni zniknęły z UI; `?period=…-Wnn`
  z URL nadal filtruje i pokazuje się w chipie surowo. Brak domyślnego okresu.
- **D3 Filtry = popover z selektorami** (`ObjectsFiltersPopover`): dwa
  kompaktowe multi-selecty (obszary życia, priorytety) i przełącznik
  `.mg-v2-switch` „Pokaż zamknięte i zarchiwizowane”. Zmiany natychmiastowe,
  bez „Zastosuj”. Pod belką rząd aktywnych chipów (`ObjectsLibraryActiveFilters`)
  tylko dla filtrów z popovera — okres nie jest tam powtarzany.
- **D4 Czas na karcie = jedna oś** (`ObjectCardTimeline`, geometria w
  `utils/objectWindow.ts`). Cel: start (data startu → pierwszy powiązany
  miesiąc → dzień utworzenia) → koniec (termin → ostatni miesiąc → otwarty).
  Chmura (pigułka mist z lekkim cieniem wklęsłym) = okno, błękit
  (sky-400/0.85) wypełnia ją do dziś i rozpływa się piórkiem pod dyskiem
  „dziś” (granat, aureola w tonie tła, pierścień). Termin = koniec chmury,
  bez osobnego znacznika. Po terminie błękit i dysk rose; bez terminu chmura
  rozpływa się w prawo i etykieta „bez terminu” (bez tonu ostrzegawczego —
  brak terminu jest legalny). Żadnych kresek na osi: „jeszcze nie” mówi
  pusta studzienka, jak w Dzisiaj (2026-10-17, plany
  `ideas/html-plans/2026-10-17-goal-timeline-sky*.html`). Priorytet: kropka
  na rok (min. 3, zawsze z bieżącym) na tej samej chmurze — minione lata
  wypełnione, przyszłe = puste studzienki. Oś jest przyciskiem, ale hover nie
  podnosi pola paper (tylko fokus klawiatury).
- **D4a Błękity danych = jedna drabinka.** Oś i sparkline'y karty biorą kolor
  z tokenów `--mg-color-data-fill` (spełnione / miniony czas, sky-400/0.85),
  `--mg-color-state-soft` (częściowo / bez celu), `--mg-color-data-target`
  (linie celu, sky-600/0.45) i `--mg-color-effort-fill` (niespełnione / po
  terminie, rose-300/0.85); linie wartości zostają atramentem (sky-800).
  Żadnych surowych `--sky-N` ani `--color-primary` w wykresach. Plan sweepu
  reszty aplikacji: `ideas/html-plans/2026-10-17-data-blues-unification.html`. Nawyki/trackery: bez osi —
  sparkline niesie czas. Intencje i KR: bez zmian. Oś celu jest widoczna tylko
  dla aktywnych, otwartych celów. Zakończone, porzucone i zarchiwizowane cele
  nie odliczają czasu ani opóźnienia; zachowują status i zapisane podsumowanie
  zamknięcia. Wynik i data zamknięcia występują tylko w metadanych na górze
  karty, bez powtórzenia w nagłówku podsumowania. Miesiące celu nadal można
  sprawdzić lub edytować przez menu.
- **D5 Przynależność = glify** (`ObjectCardAffiliation`): priorytety (kreskowany
  obrys) · obszary życia (wypełniona tablica sky-field), maks. 4 + „+N”.
  Hover/fokus wysuwa nazwę na paper. **Żadnych kolorów obszarów życia na
  kartach** — paleta produktu to błękity, róż/czerwień jako sygnał, lekki
  fiolet jako akcent; zieleń nie występuje.
- **D6 Edycja w miejscu.** Oś i glify są przyciskami (`.mg-v2-inline-trigger`)
  otwierającymi istniejące pickery (`GoalLinksDropdown.openAt`,
  `PeriodCalendarPicker.show`, `PriorityYearsDropdown.openList` — prop
  `triggerless`). Tacka hover ma tylko „⋯”; menu duplikuje „Powiązania…”,
  „Miesiące celu…”, „Lata priorytetu…”.
- **D7 Stan pusty po filtrach** wymienia, co zawęża listę (szukaj, okres,
  obszary, priorytety), żeby wskazać chip do poluzowania.

## Klawiatura

Popovery zamyka Esc z powrotem fokusu na chip. Siatka miesięcy: ←→ i ↑↓ (o 4),
Enter wybiera. Multi-select: fokus na pierwszej zaznaczonej opcji, ↑↓/Home/End
między opcjami, Esc zamyka tylko listę (dialog filtrów zostaje).

## Świadomie odłożone

- Wspólny `MonthGrid` dla `ObjectsPeriodSelect` i `PeriodCalendarPicker`
  — różne zadania (pojedynczy wybór skrótami vs dialog wieloboru z zakresami),
  wspólny komponent dodałby warianty bez zysku wizualnego.
- Glify rysują tylko aktywne priorytety/obszary (ta sama lista, co pickery).
- Ikony zastępcze: priorytet `flag`, obszar `category`, gdy encja nie ma ikony.

## Karty: zdanie pomiaru i fokus (2026-10-25, fazy P0–P1 planu „spokojne karty”)

Plan i mockupy: `ideas/html-plans/2026-10-25-object-cards-calm.html`; zrzuty
przed/po: `ideas/ux-audit-2026-10-25-object-cards/`.

- **D1 Zdanie pomiaru.** Zwinięta karta (KR, nawyk, intencja) czyta jedno
  ciche zdanie z `formatMeasurementSentence` („co najmniej 3 razy w tygodniu”,
  „3 z 4 pkt · co najmniej 4 dni w tygodniu”, „średnia co najmniej 3 na 5 ·
  co najmniej 5 dni w tygodniu”). Rozwinięta edytuje to samo zdanie w
  `MeasurementTargetSentence` (`.mg-v2-sentence`): tryb · próg checklisty ·
  skala („od 1 do 5”) · agregacja · operator · wartość · jednostka · warunek
  dni · kadencja · duch „+ dni”. Tracker bez celu ma zdanie z trybem, skalą i
  kadencją. Bloki „Skala” i „Zalicz dzień przy” zniknęły z kart i z
  `MultiItemsEditor`.
- **D4 Fokus.** Tytuły kart i etykiety elementów checklisty to
  `.mg-v2-inline-field`; pola — `.mg-v2-field`. Fokus = papier + krawędź
  akcentu, bez pierścienia (szczegóły: `docs/design-decisions.md`).
- **Odłożone do P2–P4:** siatka Okresy|Cel i nagłówki wersalikami, linia
  okresów zamiast „Wybierz okresy (17)”, checklista bez licznika z tacką i
  duchem-wierszem, ramka wykresu, priorytet jako proza, intencja w tej samej
  gramatyce, edytor nowego obiektu.
