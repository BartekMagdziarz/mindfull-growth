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
  Ołówek (kreskowana hairline) = okno, atrament = do dziś, kropki steppera =
  dziś/koniec. Po terminie rose; bez terminu ołówek blaknie i etykieta „bez
  terminu” (bez tonu ostrzegawczego — brak terminu jest legalny). Priorytet:
  kropka na rok (min. 3, zawsze z bieżącym). Nawyki/trackery: bez osi —
  sparkline niesie czas. Intencje i KR: bez zmian.
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
